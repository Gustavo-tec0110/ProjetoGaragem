"use server";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import type { NotificationType } from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeSlug } from "@/lib/garage/constants";
import { serverLog } from "@/lib/server-log";
import { performanceTimer } from "@/lib/performance";
import { PROJECT_CATALOG_CACHE_TAG, PUBLIC_PROFILE_CACHE_TAG } from "@/lib/projects/cache";
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
  return notificationId;
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
  return notificationId;
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
  const timer = performanceTimer("action", `social.${config.table}`, { carId });
  logSocialActionDiagnostic(`${config.table}.toggle.enter`, { carId });
  const authStartedAt = performance.now();
  const auth = await requireUser();
  timer.lap("auth", authStartedAt);
  if (!auth.supabase || !auth.user) {
    timer.end({ ok: false, reason: "unauthenticated" });
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
  const readsStartedAt = performance.now();
  const [, { data: car, error: carError }, { data: existing, error: existingError }] =
    await Promise.all([
      ensureUserProfile(auth.supabase, auth.user),
      auth.supabase
        .from("cars")
        .select("id, slug, owner_id, name")
        .eq("id", carId)
        .maybeSingle(),
      auth.supabase
        .from(config.table)
        .select("car_id")
        .eq("car_id", carId)
        .eq("user_id", auth.user.id)
        .maybeSingle(),
    ]);
  timer.lap("reads", readsStartedAt);

  if (carError || !car) {
    timer.end({ ok: false, reason: "project-not-found" });
    return {
      ok: false,
      message: carError?.message ?? "Projeto não encontrado.",
      active: false,
    };
  }

  if (config.ownerActionMessage && car.owner_id === auth.user.id) {
    timer.end({ ok: false, reason: "owner-action" });
    return { ok: false, message: config.ownerActionMessage, active: false };
  }

  const context = { carId, userId: auth.user.id };
  const selectAction = `${config.table}.select`;
  if (existingError) {
    logSupabaseActionError(selectAction, context, existingError);
    timer.end({ ok: false, reason: "read-error" });
    return {
      ok: false,
      message: formatSupabaseActionError(selectAction, existingError),
      active: false,
    };
  }

  const mutation = existing ? "delete" : "insert";
  const mutationAction = `${config.table}.${mutation}`;
  const mutationStartedAt = performance.now();
  const { error } = existing
    ? await auth.supabase
        .from(config.table)
        .delete()
        .eq("car_id", carId)
        .eq("user_id", auth.user.id)
    : await auth.supabase
        .from(config.table)
        .insert({ car_id: carId, user_id: auth.user.id });
  timer.lap("mutation", mutationStartedAt, { mutation });

  if (error) {
    logSupabaseActionError(mutationAction, context, error);
    timer.end({ ok: false, reason: "mutation-error" });
    return {
      ok: false,
      message: formatSupabaseActionError(mutationAction, error),
      active: Boolean(existing),
    };
  }

  const shouldExist = !existing;
  const finalizeStartedAt = performance.now();
  const [counts] = await Promise.all([
    readCarSocialCounts(auth.supabase, carId),
    shouldExist
      ? notifyCarOwner({
          supabase: auth.supabase,
          actorId: auth.user.id,
          ownerId: car.owner_id,
          carId,
          type: config.notificationType,
          title: config.notificationTitle(car.name),
          body: config.notificationBody,
        })
      : Promise.resolve(null),
  ]);
  timer.lap("finalize", finalizeStartedAt);
  updateTag(PROJECT_CATALOG_CACHE_TAG);
  updateTag(PUBLIC_PROFILE_CACHE_TAG);
  timer.end({ ok: true, active: shouldExist });
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
  updateTag(PUBLIC_PROFILE_CACHE_TAG);
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

  revalidateTag(PROJECT_CATALOG_CACHE_TAG, "max");
  updateTag(PUBLIC_PROFILE_CACHE_TAG);
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
  const timer = performanceTimer("action", "social.user_follows", { profileId });
  logSocialActionDiagnostic("toggleFollowUserAction.enter", { recipientId: profileId });
  const authStartedAt = performance.now();
  const auth = await requireUser();
  timer.lap("auth", authStartedAt);
  if (!auth.supabase || !auth.user) {
    timer.end({ ok: false, reason: "unauthenticated" });
    return { ok: false, message: auth.error ?? "Entre para seguir perfis.", active: false };
  }
  logSocialActionDiagnostic("toggleFollowUserAction.auth", { actorId: auth.user.id, recipientId: profileId });

  if (!profileId || profileId === auth.user.id) {
    timer.end({ ok: false, reason: "self-follow" });
    return { ok: false, message: "Você não pode seguir o próprio perfil.", active: false };
  }

  const readsStartedAt = performance.now();
  const [, { data: existing, error: existingError }, { data: actorProfile }] =
    await Promise.all([
      ensureUserProfile(auth.supabase, auth.user),
      auth.supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", auth.user.id)
        .eq("following_id", profileId)
        .maybeSingle(),
      auth.supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", auth.user.id)
        .maybeSingle(),
    ]);
  timer.lap("reads", readsStartedAt);

  if (existingError) {
    logSupabaseActionError("user_follows.select", { followerId: auth.user.id, followingId: profileId }, existingError);
    timer.end({ ok: false, reason: "read-error" });
    return { ok: false, message: formatSupabaseActionError("user_follows.select", existingError), active: false };
  }

  if (existing) {
    const mutationStartedAt = performance.now();
    const { error } = await auth.supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", auth.user.id)
      .eq("following_id", profileId);
    timer.lap("mutation", mutationStartedAt, { mutation: "delete" });
    if (error) {
      logSupabaseActionError("user_follows.delete", { followerId: auth.user.id, followingId: profileId }, error);
    }
    if (!error) updateTag(PUBLIC_PROFILE_CACHE_TAG);
    timer.end({ ok: !error, active: false });
    return {
      ok: !error,
      message: error ? formatSupabaseActionError("user_follows.delete", error) : undefined,
      active: false,
    };
  }

  const mutationStartedAt = performance.now();
  const { error } = await auth.supabase.from("user_follows").insert({
    follower_id: auth.user.id,
    following_id: profileId,
  });
  timer.lap("mutation", mutationStartedAt, { mutation: "insert" });

  if (error) {
    logSupabaseActionError("user_follows.insert", { followerId: auth.user.id, followingId: profileId }, error);
  }

  if (!error) {
    const notificationStartedAt = performance.now();
    await notifyProfileFollow({
      supabase: auth.supabase,
      actorId: auth.user.id,
      profileId,
      actorName: actorProfile?.display_name ?? actorProfile?.username ?? "Alguem",
    });
    timer.lap("notification", notificationStartedAt);
    updateTag(PUBLIC_PROFILE_CACHE_TAG);
  }

  timer.end({ ok: !error, active: !error });
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

export async function incrementViewAction(carId: string) {
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

  return { ok: true, ...counts };
}

export async function createCommentAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState & { comment?: CarCommentWithAuthor }> {
  const timer = performanceTimer("action", "comment.create");
  const authStartedAt = performance.now();
  const auth = await requireUser();
  timer.lap("auth", authStartedAt);
  if (!auth.supabase || !auth.user) {
    timer.end({ ok: false, reason: "unauthenticated" });
    return { status: "error", message: auth.error ?? "Entre para comentar." };
  }

  const carId = text(formData, "car_id");
  const content = text(formData, "content");
  if (!carId || content.length < 2) {
    timer.end({ ok: false, reason: "validation" });
    return { status: "error", message: "Escreva um comentario com pelo menos 2 caracteres." };
  }

  const prepareStartedAt = performance.now();
  const [, { data: car }] = await Promise.all([
    ensureUserProfile(auth.supabase, auth.user),
    auth.supabase
      .from("cars")
      .select("id, owner_id, name")
      .eq("id", carId)
      .maybeSingle(),
  ]);
  timer.lap("prepare", prepareStartedAt);

  const insertStartedAt = performance.now();
  const { data: comment, error } = await auth.supabase
    .from("car_comments")
    .insert({
      car_id: carId,
      user_id: auth.user.id,
      content,
    })
    .select("*")
    .maybeSingle();
  timer.lap("insert", insertStartedAt);

  if (error || !comment) {
    timer.end({ ok: false, reason: "insert-error" });
    return { status: "error", message: error?.message ?? "Nao foi possivel publicar o comentario." };
  }

  const finalizeStartedAt = performance.now();
  const [{ data: author }] = await Promise.all([
    auth.supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, city, state, instagram_handle")
      .eq("id", auth.user.id)
      .maybeSingle(),
    car
      ? notifyCarOwner({
          supabase: auth.supabase,
          actorId: auth.user.id,
          ownerId: car.owner_id,
          carId,
          type: "project_comment",
          title: `${car.name} recebeu um comentário`,
          body: content.slice(0, 160),
        })
      : Promise.resolve(null),
  ]);
  timer.lap("finalize", finalizeStartedAt);
  updateTag(PROJECT_CATALOG_CACHE_TAG);
  updateTag(PUBLIC_PROFILE_CACHE_TAG);
  timer.end({ ok: true });
  return {
    status: "success",
    message: "Comentario publicado.",
    comment: {
      ...comment,
      author: (author as ProfileSummary | null) ?? null,
    } as CarCommentWithAuthor,
  };
}

export async function deleteCommentAction(commentId: string) {
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
  if (!error) {
    updateTag(PROJECT_CATALOG_CACHE_TAG);
    updateTag(PUBLIC_PROFILE_CACHE_TAG);
  }
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

  return { ok: !error, message: error?.message };
}
