"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { NotificationType } from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeSlug } from "@/lib/garage/constants";
import { serverLog } from "@/lib/server-log";
import type { CarCommentWithAuthor, ProfileSummary } from "@/lib/supabase/queries";
import {
  ensureUserProfile,
  requireSupabaseUser,
  type ServerSupabaseClient,
} from "@/lib/supabase/auth-server";

export type ActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

type SupabaseActionError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

type DiagnosticContext = Record<string, string | boolean | null | undefined>;

function formatSupabaseActionError(action: string, error: SupabaseActionError) {
  const code = error.code ? ` (${error.code})` : "";
  return `${action} falhou${code}: ${error.message}`;
}

function logSupabaseActionError(action: string, context: Record<string, string>, error: SupabaseActionError) {
  serverLog.error("social-action", {
    action,
    ...context,
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

function logNotificationRpcError(
  action: string,
  context: DiagnosticContext,
  error: SupabaseActionError
) {
  serverLog.error("notification-rpc", {
    action,
    ...context,
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

function logSocialActionDiagnostic(action: string, context: DiagnosticContext = {}) {
  serverLog.info("social-action-diagnostic", { action, ...context });
}

async function createNotification(
  supabase: ServerSupabaseClient,
  {
    actorId,
    recipientId,
    type,
    carId,
    title,
    body,
    dedupe = true,
    source,
  }: {
    actorId: string;
    recipientId: string;
    type: NotificationType;
    carId: string | null;
    title: string;
    body?: string | null;
    dedupe?: boolean;
    source: string;
  }
) {
  const rpcContext = {
    source,
    actorId,
    recipientId,
    carId,
    notificationType: type,
    dedupe,
  };
  serverLog.info("notification-rpc", {
    action: "create_notification.before",
    ...rpcContext,
  });

  const { data, error } = await supabase.rpc("create_notification", {
    p_recipient_id: recipientId,
    p_notification_type: type,
    p_car_id: carId,
    p_notification_title: title,
    p_notification_body: body ?? null,
    p_dedupe: dedupe,
  });

  serverLog.info("notification-rpc", {
    action: "create_notification.after",
    ...rpcContext,
    data,
    error,
  });

  if (error) {
    logNotificationRpcError(source, rpcContext, error);
    return null;
  }

  if (!data) {
    serverLog.warn("notification-rpc", {
      action: `${source}.skipped`,
      ...rpcContext,
    });
  }

  return data;
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? value : null;
}

async function requireUser() {
  return requireSupabaseUser();
}

async function notifyCarOwner({
  supabase,
  actorId,
  ownerId,
  carId,
  type,
  title,
  body,
  dedupe = true,
}: {
  supabase: ServerSupabaseClient;
  actorId: string;
  ownerId: string | null | undefined;
  carId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  dedupe?: boolean;
}) {
  if (!ownerId || ownerId === actorId) {
    serverLog.warn("notification-rpc", {
      action: "notifyCarOwner.skipped",
      actorId,
      recipientId: ownerId ?? null,
      carId,
      notificationType: type,
      reason: !ownerId ? "missing-owner" : "self-action",
    });
    return;
  }

  const notificationId = await createNotification(supabase, {
    actorId,
    recipientId: ownerId,
    type,
    carId,
    title,
    body,
    dedupe,
    source: "notifyCarOwner",
  });
  if (notificationId) revalidatePath("/notificacoes");
}

async function notifyProfileFollow({
  supabase,
  actorId,
  profileId,
  actorName,
}: {
  supabase: ServerSupabaseClient;
  actorId: string;
  profileId: string;
  actorName: string;
}) {
  if (profileId === actorId) {
    serverLog.warn("notification-rpc", {
      action: "notifyProfileFollow.skipped",
      actorId,
      recipientId: profileId,
      carId: null,
      notificationType: "follow",
      reason: "self-action",
    });
    return;
  }

  const notificationId = await createNotification(supabase, {
    actorId,
    recipientId: profileId,
    type: "follow",
    carId: null,
    title: `${actorName} comecou a seguir voce`,
    body: "Seu perfil ganhou um novo seguidor.",
    dedupe: true,
    source: "notifyProfileFollow",
  });
  if (notificationId) revalidatePath("/notificacoes");
}

async function readCarSocialCounts(supabase: ServerSupabaseClient, carId: string) {
  const { data } = await supabase
    .from("cars")
    .select("likes_count, saves_count, views_count, project_followers_count")
    .eq("id", carId)
    .maybeSingle();

  return {
    likesCount: data?.likes_count ?? 0,
    savesCount: data?.saves_count ?? 0,
    viewsCount: data?.views_count ?? 0,
    followersCount: data?.project_followers_count ?? 0,
  };
}

async function verifySocialRow(
  supabase: ServerSupabaseClient,
  table: "car_likes" | "car_saves" | "project_follows",
  carId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from(table)
    .select("car_id")
    .eq("car_id", carId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logSupabaseActionError(`${table}.select`, { carId, userId }, error);
    return { ok: false, exists: false, message: formatSupabaseActionError(`${table}.select`, error) };
  }

  return { ok: true, exists: Boolean(data), message: null };
}

function revalidateProjectSocialPaths(slug?: string | null) {
  revalidatePath("/");
  revalidatePath("/explorar");
  revalidatePath("/rankings");
  revalidatePath("/garagem");
  revalidatePath("/perfil");
  if (slug) {
    revalidatePath(`/projeto/${slug}`);
    revalidatePath(`/carros/${slug}`);
  }
}

type CarSocialTable = "car_likes" | "car_saves" | "project_follows";

type CarSocialToggleConfig = {
  table: CarSocialTable;
  unauthenticatedMessage: string;
  notificationType: Extract<NotificationType, "project_like" | "project_save" | "project_follow">;
  notificationTitle: (carName: string) => string;
  notificationBody: string;
  ownerActionMessage?: string;
};

async function toggleCarSocialAction(carId: string, config: CarSocialToggleConfig) {
  logSocialActionDiagnostic(`${config.table}.toggle.enter`, { carId });
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) {
    return {
      ok: false,
      message: auth.error ?? config.unauthenticatedMessage,
      active: false,
    };
  }

  logSocialActionDiagnostic(`${config.table}.toggle.auth`, {
    carId,
    actorId: auth.user.id,
  });
  await ensureUserProfile(auth.supabase, auth.user);

  const { data: car, error: carError } = await auth.supabase
    .from("cars")
    .select("id, slug, owner_id, name")
    .eq("id", carId)
    .maybeSingle();

  if (carError || !car) {
    return {
      ok: false,
      message: carError?.message ?? "Projeto não encontrado.",
      active: false,
    };
  }

  if (config.ownerActionMessage && car.owner_id === auth.user.id) {
    return { ok: false, message: config.ownerActionMessage, active: false };
  }

  const context = { carId, userId: auth.user.id };
  const selectAction = `${config.table}.select`;
  const { data: existing, error: existingError } = await auth.supabase
    .from(config.table)
    .select("car_id")
    .eq("car_id", carId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (existingError) {
    logSupabaseActionError(selectAction, context, existingError);
    return {
      ok: false,
      message: formatSupabaseActionError(selectAction, existingError),
      active: false,
    };
  }

  const mutation = existing ? "delete" : "insert";
  const mutationAction = `${config.table}.${mutation}`;
  const { error } = existing
    ? await auth.supabase
        .from(config.table)
        .delete()
        .eq("car_id", carId)
        .eq("user_id", auth.user.id)
    : await auth.supabase
        .from(config.table)
        .insert({ car_id: carId, user_id: auth.user.id });

  if (error) {
    logSupabaseActionError(mutationAction, context, error);
    return {
      ok: false,
      message: formatSupabaseActionError(mutationAction, error),
      active: Boolean(existing),
    };
  }

  const verification = await verifySocialRow(
    auth.supabase,
    config.table,
    carId,
    auth.user.id
  );
  const shouldExist = !existing;
  if (!verification.ok || verification.exists !== shouldExist) {
    const message =
      verification.message ??
      `${mutationAction} falhou: registro ${shouldExist ? "não foi encontrado" : "ainda existe"} após ${mutation}.`;
    serverLog.error("social-action.verify", {
      action: mutationAction,
      ...context,
      message,
    });
    return { ok: false, message, active: Boolean(existing) };
  }

  if (shouldExist) {
    await notifyCarOwner({
      supabase: auth.supabase,
      actorId: auth.user.id,
      ownerId: car.owner_id,
      carId,
      type: config.notificationType,
      title: config.notificationTitle(car.name),
      body: config.notificationBody,
    });
  }

  const counts = await readCarSocialCounts(auth.supabase, carId);
  revalidateProjectSocialPaths(car.slug);
  return { ok: true, active: shouldExist, ...counts };
}

export async function saveProfileAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { status: "error", message: auth.error ?? "Erro de autenticacao." };

  const username = normalizeSlug(text(formData, "username")).slice(0, 24);
  const displayName = text(formData, "display_name");

  if (username.length < 3) return { status: "error", message: "Escolha um username com pelo menos 3 caracteres." };
  if (!displayName) return { status: "error", message: "Informe seu nome." };

  const { error } = await auth.supabase.from("profiles").upsert({
    id: auth.user.id,
    username,
    display_name: displayName,
    avatar_url:
      nullableText(formData, "avatar_url") ??
      (typeof auth.user.user_metadata?.avatar_url === "string" ? auth.user.user_metadata.avatar_url : null),
    bio: nullableText(formData, "bio"),
    city: nullableText(formData, "city"),
    state: nullableText(formData, "state"),
    instagram_handle: nullableText(formData, "instagram_handle"),
    is_saves_public: formData.get("is_saves_public") === "true",
    is_likes_public: formData.get("is_likes_public") === "true",
  });

  if (error) return { status: "error", message: error.message };

  revalidatePath("/perfil");
  revalidatePath(`/perfil/${username}`);
  redirect("/garagem");
}

export async function deleteCarAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) {
    return { status: "error", message: auth.error ?? "Erro de autenticacao." };
  }

  const carId = text(formData, "car_id");
  if (!carId) return { status: "error", message: "Projeto não encontrado." };

  const { data: current, error: readError } = await auth.supabase
    .from("cars")
    .select("id, owner_id, slug")
    .eq("id", carId)
    .maybeSingle();

  if (readError) return { status: "error", message: readError.message };
  if (!current || current.owner_id !== auth.user.id) {
    return { status: "error", message: "Você só pode excluir seus próprios projetos." };
  }

  const { error } = await auth.supabase
    .from("cars")
    .delete()
    .eq("id", carId)
    .eq("owner_id", auth.user.id);

  if (error) return { status: "error", message: error.message };

  revalidatePath("/");
  revalidatePath("/explorar");
  revalidatePath("/rankings");
  revalidatePath("/buscar");
  revalidatePath("/comparar");
  revalidatePath("/garagem");
  revalidatePath(`/carros/${current.slug}`);
  revalidatePath(`/projeto/${current.slug}`);
  redirect("/garagem");
}

export async function toggleLikeAction(carId: string) {
  return toggleCarSocialAction(carId, {
    table: "car_likes",
    unauthenticatedMessage: "Entre para curtir.",
    notificationType: "project_like",
    notificationTitle: (carName) => `${carName} recebeu uma curtida`,
    notificationBody: "Alguém curtiu seu projeto.",
  });
}

export async function toggleSaveAction(carId: string) {
  return toggleCarSocialAction(carId, {
    table: "car_saves",
    unauthenticatedMessage: "Entre para salvar.",
    notificationType: "project_save",
    notificationTitle: (carName) => `${carName} foi salvo`,
    notificationBody: "Alguém salvou seu projeto na garagem.",
  });
}

export async function toggleFollowUserAction(profileId: string) {
  logSocialActionDiagnostic("toggleFollowUserAction.enter", { recipientId: profileId });
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) {
    return { ok: false, message: auth.error ?? "Entre para seguir perfis.", active: false };
  }
  logSocialActionDiagnostic("toggleFollowUserAction.auth", { actorId: auth.user.id, recipientId: profileId });
  await ensureUserProfile(auth.supabase, auth.user);

  if (!profileId || profileId === auth.user.id) {
    return { ok: false, message: "Você não pode seguir o próprio perfil.", active: false };
  }

  const { data: existing, error: existingError } = await auth.supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", auth.user.id)
    .eq("following_id", profileId)
    .maybeSingle();

  if (existingError) {
    logSupabaseActionError("user_follows.select", { followerId: auth.user.id, followingId: profileId }, existingError);
    return { ok: false, message: formatSupabaseActionError("user_follows.select", existingError), active: false };
  }

  if (existing) {
    const { error } = await auth.supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", auth.user.id)
      .eq("following_id", profileId);
    if (error) {
      logSupabaseActionError("user_follows.delete", { followerId: auth.user.id, followingId: profileId }, error);
    }
    revalidatePath("/garagem");
    revalidatePath("/perfil");
    return {
      ok: !error,
      message: error ? formatSupabaseActionError("user_follows.delete", error) : undefined,
      active: false,
    };
  }

  const { error } = await auth.supabase.from("user_follows").insert({
    follower_id: auth.user.id,
    following_id: profileId,
  });

  if (error) {
    logSupabaseActionError("user_follows.insert", { followerId: auth.user.id, followingId: profileId }, error);
  }

  if (!error) {
    const { data: actorProfile } = await auth.supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", auth.user.id)
      .maybeSingle();

    await notifyProfileFollow({
      supabase: auth.supabase,
      actorId: auth.user.id,
      profileId,
      actorName: actorProfile?.display_name ?? actorProfile?.username ?? "Alguem",
    });
  }

  revalidatePath("/garagem");
  revalidatePath("/perfil");
  return {
    ok: !error,
    message: error ? formatSupabaseActionError("user_follows.insert", error) : undefined,
    active: !error,
  };
}

export async function toggleProjectFollowAction(carId: string) {
  return toggleCarSocialAction(carId, {
    table: "project_follows",
    unauthenticatedMessage: "Entre para seguir projetos.",
    notificationType: "project_follow",
    notificationTitle: (carName) => `${carName} ganhou um seguidor`,
    notificationBody: "Alguém começou a acompanhar este projeto.",
    ownerActionMessage: "Você já é dono deste projeto.",
  });
}

export async function incrementViewAction(carId: string, carSlug: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false };

  const { data, error } = await supabase.rpc("increment_car_view", {
    target_car_id: carId,
  });

  if (error) {
    logSupabaseActionError("increment_car_view.rpc", { carId }, error);
    return { ok: false, message: formatSupabaseActionError("increment_car_view.rpc", error) };
  }

  if (!data) {
    const message = "increment_car_view.rpc falhou: nenhuma linha publica foi atualizada.";
    serverLog.error("social-action.verify", {
      action: "increment_car_view.rpc",
      carId,
      message,
    });
    return { ok: false, message };
  }

  const counts = await readCarSocialCounts(supabase, carId);
  revalidateProjectSocialPaths(carSlug);

  return { ok: true, ...counts };
}

export async function createCommentAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState & { comment?: CarCommentWithAuthor }> {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { status: "error", message: auth.error ?? "Entre para comentar." };
  await ensureUserProfile(auth.supabase, auth.user);

  const carId = text(formData, "car_id");
  const slug = text(formData, "slug");
  const content = text(formData, "content");
  if (!carId || content.length < 2) return { status: "error", message: "Escreva um comentario com pelo menos 2 caracteres." };

  const { data: car } = await auth.supabase
    .from("cars")
    .select("id, owner_id, name")
    .eq("id", carId)
    .maybeSingle();

  const { data: comment, error } = await auth.supabase
    .from("car_comments")
    .insert({
      car_id: carId,
      user_id: auth.user.id,
      content,
    })
    .select("*")
    .maybeSingle();

  if (error || !comment) return { status: "error", message: error?.message ?? "Nao foi possivel publicar o comentario." };

  const { data: author } = await auth.supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, city, state, instagram_handle")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (car) {
    await notifyCarOwner({
      supabase: auth.supabase,
      actorId: auth.user.id,
      ownerId: car.owner_id,
      carId,
      type: "project_comment",
      title: `${car.name} recebeu um comentário`,
      body: content.slice(0, 160),
    });
  }
  revalidatePath(`/projeto/${slug}`);
  revalidatePath(`/carros/${slug}`);
  return {
    status: "success",
    message: "Comentario publicado.",
    comment: {
      ...comment,
      author: (author as ProfileSummary | null) ?? null,
    } as CarCommentWithAuthor,
  };
}

export async function deleteCommentAction(commentId: string, carSlug: string) {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { ok: false, message: auth.error ?? "Entre para continuar." };

  const { data: comment, error: readError } = await auth.supabase
    .from("car_comments")
    .select("id, user_id, car_id")
    .eq("id", commentId)
    .maybeSingle();

  if (readError) return { ok: false, message: readError.message };
  if (!comment) return { ok: false, message: "Comentario nao encontrado." };

  const { data: car } = await auth.supabase
    .from("cars")
    .select("owner_id")
    .eq("id", comment.car_id)
    .maybeSingle();

  if (comment.user_id !== auth.user.id && car?.owner_id !== auth.user.id) {
    return { ok: false, message: "Voce so pode excluir seus proprios comentarios." };
  }

  const { error } = await auth.supabase.from("car_comments").delete().eq("id", commentId);
  revalidatePath(`/projeto/${carSlug}`);
  revalidatePath(`/carros/${carSlug}`);
  return { ok: !error, message: error?.message };
}

export async function markNotificationReadAction(notificationId: string) {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) {
    return { ok: false, message: auth.error ?? "Entre para ver notificações." };
  }

  const { error } = await auth.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", auth.user.id);

  revalidatePath("/notificacoes");
  return { ok: !error, message: error?.message };
}

export async function markNotificationsReadAction(notificationIds: string[]) {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) {
    return { ok: false, message: auth.error ?? "Entre para ver notificações." };
  }

  const ids = Array.from(new Set(notificationIds)).filter((id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  );
  if (!ids.length) return { ok: true };

  const { error } = await auth.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .eq("user_id", auth.user.id)
    .is("read_at", null);

  revalidatePath("/notificacoes");
  return { ok: !error, message: error?.message };
}
