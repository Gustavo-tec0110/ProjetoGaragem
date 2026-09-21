import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import process from "node:process";

const PROJECT_REF = "hxqhudfzdwfxnjzmphya";
const url = process.env.QA_SUPABASE_URL;
const anonKey = process.env.QA_SUPABASE_ANON_KEY;
const serviceKey = process.env.QA_SUPABASE_SERVICE_KEY;

if (!url?.includes(PROJECT_REF) || !anonKey || !serviceKey) {
  throw new Error("QA environment is not configured for ProjetoGaragem.");
}

const service = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const password = `QA!${randomUUID()}aA9`;
const createdUserIds = [];
const createdUsers = [];
const createdCarIds = [];
const uploadedPaths = [];
const checks = [];

function check(condition, label) {
  if (!condition) throw new Error(`QA assertion failed: ${label}`);
  checks.push(label);
}

function client(key = anonKey, headers = {}) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers },
  });
}

async function createQaUser(label) {
  const email = `qa-projeto-garagem-${label}-${runId}@example.invalid`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `QA Projeto Garagem ${label}`, username: `qa_${label}_${runId}` },
  });
  if (error || !data.user) throw error ?? new Error("QA user was not created.");
  createdUserIds.push(data.user.id);

  const authClient = client();
  const signIn = await authClient.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  const createdUser = { id: data.user.id, client: authClient };
  createdUsers.push(createdUser);
  return createdUser;
}

function carPayload(ownerId, slug, overrides = {}) {
  return {
    owner_id: ownerId,
    slug,
    name: "QA Projeto Atômico",
    brand: "QA Motors",
    model: "Rollback",
    year: 2001,
    category: "Projeto automotivo",
    description: "Registro descartável de validação pré-beta.",
    main_photo_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70",
    photo_urls: ["https://images.unsplash.com/photo-1503376780353-7e6692767b70"],
    tags: ["#qa", "#gasolina", "#turbo", "#rwd"],
    current_induction: "Turbo",
    fuel_type: "Gasolina",
    drivetrain: "RWD",
    show_expenses_public: true,
    is_public: true,
    ...overrides,
  };
}

function relatedPayload(label = "Inicial") {
  return {
    photos: [
      {
        url: `https://images.unsplash.com/photo-1503376780353-7e6692767b70?qa=${encodeURIComponent(label)}`,
        alt: `QA ${label}`,
        sort_order: 0,
      },
    ],
    parts: [
      {
        name: `Turbina QA ${label}`,
        category: "Motor",
        status: "installed",
        brand: "QA Parts",
        price_estimate: 2500,
      },
    ],
    updates: [
      {
        title: `Evolução QA ${label}`,
        description: "Validação transacional.",
        photo_urls: [],
        category: "performance",
        happened_at: "2026-09-20",
        amount_spent: 500,
      },
    ],
    expenses: [
      {
        name: `Despesa QA ${label}`,
        category: "Motor",
        amount: 500,
        spent_at: "2026-09-20",
        note: "Descartável",
        is_public: true,
      },
    ],
  };
}

async function saveProject(authClient, carId, car, related) {
  return authClient.rpc("save_car_project_atomic", {
    p_car_id: carId,
    p_car: car,
    p_photos: related.photos,
    p_parts: related.parts,
    p_updates: related.updates,
    p_expenses: related.expenses,
  });
}

async function projectState(dataClient, carId) {
  const [car, photos, parts, updates, expenses] = await Promise.all([
    dataClient.from("cars").select("*").eq("id", carId).single(),
    dataClient.from("car_photos").select("*").eq("car_id", carId).order("id"),
    dataClient.from("car_parts").select("*").eq("car_id", carId).order("id"),
    dataClient.from("car_build_updates").select("*").eq("car_id", carId).order("id"),
    dataClient.from("car_expenses").select("*").eq("car_id", carId).order("id"),
  ]);
  for (const result of [car, photos, parts, updates, expenses]) {
    if (result.error) throw result.error;
  }
  return {
    car: car.data,
    photos: photos.data,
    parts: parts.data,
    updates: updates.data,
    expenses: expenses.data,
  };
}

async function main() {
  const userA = await createQaUser("a");
  const userB = await createQaUser("b");

  const initialSlug = `qa-atomic-success-${runId}`;
  const initialRelated = relatedPayload("Criação");
  const created = await saveProject(
    userA.client,
    null,
    carPayload(userA.id, initialSlug),
    initialRelated
  );
  if (created.error || !created.data?.[0]) throw created.error ?? new Error("Atomic create returned no row.");
  const carId = created.data[0].id;
  createdCarIds.push(carId);
  const createdState = await projectState(userA.client, carId);
  check(createdState.photos.length === 1, "atomic create persisted photos");
  check(createdState.parts.length === 1, "atomic create persisted parts");
  check(createdState.updates.length === 1, "atomic create persisted updates");
  check(createdState.expenses.length === 1, "atomic create persisted expenses");

  const rollbackCreateSlug = `qa-atomic-create-rollback-${runId}`;
  const brokenCreateRelated = relatedPayload("Rollback criação");
  brokenCreateRelated.parts[0].status = "invalid";
  const brokenCreate = await saveProject(
    userA.client,
    null,
    carPayload(userA.id, rollbackCreateSlug),
    brokenCreateRelated
  );
  check(Boolean(brokenCreate.error), "atomic create rejects controlled intermediate failure");
  const rolledBackCreate = await userA.client.from("cars").select("id").eq("slug", rollbackCreateSlug);
  if (rolledBackCreate.error) throw rolledBackCreate.error;
  check(rolledBackCreate.data.length === 0, "atomic create leaves no partial car");

  const editedRelated = relatedPayload("Edição");
  const edited = await saveProject(
    userA.client,
    carId,
    carPayload(userA.id, initialSlug, { name: "QA Projeto Editado", power_cv: 321 }),
    editedRelated
  );
  if (edited.error) throw edited.error;
  const editedState = await projectState(userA.client, carId);
  check(editedState.car.name === "QA Projeto Editado", "atomic edit persisted car");
  check(editedState.parts[0]?.name.includes("Edição"), "atomic edit replaced relations");

  const beforeRollback = JSON.stringify(editedState);
  const brokenEditRelated = relatedPayload("Rollback edição");
  brokenEditRelated.updates[0].category = "invalid";
  const brokenEdit = await saveProject(
    userA.client,
    carId,
    carPayload(userA.id, initialSlug, { name: "QA NÃO DEVE PERSISTIR" }),
    brokenEditRelated
  );
  check(Boolean(brokenEdit.error), "atomic edit rejects controlled intermediate failure");
  const afterRollback = JSON.stringify(await projectState(userA.client, carId));
  check(afterRollback === beforeRollback, "atomic edit fully restores previous state");

  const unauthorizedEdit = await saveProject(
    userB.client,
    carId,
    carPayload(userB.id, initialSlug, { name: "QA invasão" }),
    relatedPayload("Sem autorização")
  );
  check(Boolean(unauthorizedEdit.error), "user B cannot edit user A project");
  const unauthorizedDelete = await userB.client.from("cars").delete().eq("id", carId).select("id");
  if (unauthorizedDelete.error) throw unauthorizedDelete.error;
  check(unauthorizedDelete.data.length === 0, "user B cannot delete user A project");

  const privateSlug = `qa-private-${runId}`;
  const privateCreated = await saveProject(
    userA.client,
    null,
    carPayload(userA.id, privateSlug, { name: "QA Privado", is_public: false }),
    { photos: [], parts: [], updates: [], expenses: [] }
  );
  if (privateCreated.error || !privateCreated.data?.[0]) throw privateCreated.error;
  const privateCarId = privateCreated.data[0].id;
  createdCarIds.push(privateCarId);
  const privateRead = await userB.client.from("cars").select("id").eq("id", privateCarId).maybeSingle();
  check(!privateRead.error && privateRead.data === null, "private project is hidden from another user");

  const ownSlug = `qa-user-b-own-${runId}`;
  const ownCreated = await saveProject(
    userB.client,
    null,
    carPayload(userB.id, ownSlug, { name: "QA Projeto do usuário B" }),
    { photos: [], parts: [], updates: [], expenses: [] }
  );
  if (ownCreated.error || !ownCreated.data?.[0]) throw ownCreated.error;
  const ownCarId = ownCreated.data[0].id;
  createdCarIds.push(ownCarId);
  const ownEdit = await saveProject(
    userB.client,
    ownCarId,
    carPayload(userB.id, ownSlug, { name: "QA Projeto B editado" }),
    { photos: [], parts: [], updates: [], expenses: [] }
  );
  if (ownEdit.error) throw ownEdit.error;
  const ownDelete = await userB.client.from("cars").delete().eq("id", ownCarId).select("id");
  if (ownDelete.error) throw ownDelete.error;
  check(ownDelete.data.length === 1, "user B can edit and delete own project");
  createdCarIds.splice(createdCarIds.indexOf(ownCarId), 1);

  const interactionRows = [
    ["car_likes", { car_id: carId, user_id: userB.id }],
    ["car_saves", { car_id: carId, user_id: userB.id }],
    ["project_follows", { car_id: carId, user_id: userB.id }],
    ["user_follows", { follower_id: userB.id, following_id: userA.id }],
  ];
  for (const [table, row] of interactionRows) {
    const inserted = await userB.client.from(table).insert(row);
    if (inserted.error) throw inserted.error;
  }
  const comment = await userB.client
    .from("car_comments")
    .insert({ car_id: carId, user_id: userB.id, content: "Comentário QA descartável" })
    .select("id")
    .single();
  if (comment.error) throw comment.error;
  const notification = await userB.client.rpc("create_notification", {
    p_recipient_id: userA.id,
    p_notification_type: "project_comment",
    p_car_id: carId,
    p_notification_title: "Notificação QA",
    p_notification_body: "Descartável",
    p_dedupe: false,
  });
  if (notification.error || !notification.data) throw notification.error;
  const notificationRead = await userA.client
    .from("notifications")
    .select("id")
    .eq("id", notification.data)
    .maybeSingle();
  check(Boolean(notificationRead.data), "notification is visible to recipient");

  const deletedComment = await userB.client.from("car_comments").delete().eq("id", comment.data.id);
  if (deletedComment.error) throw deletedComment.error;
  for (const [table, row] of interactionRows) {
    let deletion = userB.client.from(table).delete();
    for (const [column, value] of Object.entries(row)) deletion = deletion.eq(column, value);
    const deleted = await deletion;
    if (deleted.error) throw deleted.error;
  }
  checks.push("like/unlike, save/unsave, follow/unfollow and comment/delete succeeded");

  const storagePath = `${userA.id}/qa-${runId}.png`;
  const uploaded = await userA.client.storage
    .from("project-images")
    .upload(storagePath, new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), {
      contentType: "image/png",
      upsert: false,
    });
  if (uploaded.error) throw uploaded.error;
  uploadedPaths.push(storagePath);
  check(Boolean(uploaded.data?.path), "authenticated image upload succeeded");

  const counterBefore = editedState.car.views_count;
  const visitorA = client(anonKey, { "User-Agent": `ProjetoGaragem-QA-visitor-A-${runId}` });
  const visitorB = client(anonKey, { "User-Agent": `ProjetoGaragem-QA-visitor-B-${runId}` });
  const visitorC = client(anonKey, { "User-Agent": `ProjetoGaragem-QA-visitor-C-${runId}` });
  const firstView = await visitorA.rpc("increment_car_view", { target_car_id: carId });
  if (firstView.error) throw firstView.error;
  check(firstView.data?.[0]?.incremented === true, "first anonymous view increments");
  const repeatedView = await visitorA.rpc("increment_car_view", { target_car_id: carId });
  if (repeatedView.error) throw repeatedView.error;
  check(repeatedView.data?.[0]?.incremented === false, "repeated anonymous view is deduplicated");
  const otherVisitor = await visitorB.rpc("increment_car_view", { target_car_id: carId });
  if (otherVisitor.error) throw otherVisitor.error;
  check(otherVisitor.data?.[0]?.incremented === true, "different anonymous context increments");
  const authViewA = await userA.client.rpc("increment_car_view", { target_car_id: carId });
  const authViewARepeat = await userA.client.rpc("increment_car_view", { target_car_id: carId });
  const authViewB = await userB.client.rpc("increment_car_view", { target_car_id: carId });
  if (authViewA.error || authViewARepeat.error || authViewB.error) {
    throw authViewA.error ?? authViewARepeat.error ?? authViewB.error;
  }
  check(authViewA.data?.[0]?.incremented === true, "first authenticated view increments");
  check(authViewARepeat.data?.[0]?.incremented === false, "authenticated repeat is deduplicated");
  check(authViewB.data?.[0]?.incremented === true, "different authenticated user increments");
  const concurrent = await Promise.all(
    Array.from({ length: 5 }, () => visitorC.rpc("increment_car_view", { target_car_id: carId }))
  );
  if (concurrent.some((result) => result.error)) throw concurrent.find((result) => result.error).error;
  check(
    concurrent.filter((result) => result.data?.[0]?.incremented).length === 1,
    "concurrent repeated views increment once"
  );
  const privateView = await visitorA.rpc("increment_car_view", { target_car_id: privateCarId });
  const missingView = await visitorA.rpc("increment_car_view", { target_car_id: randomUUID() });
  if (privateView.error || missingView.error) throw privateView.error ?? missingView.error;
  check(privateView.data?.[0]?.views_count === null, "private project view does not increment");
  check(missingView.data?.[0]?.views_count === null, "missing project view does not increment");
  const counterAfter = await userA.client.from("cars").select("views_count").eq("id", carId).single();
  if (counterAfter.error) throw counterAfter.error;
  check(counterAfter.data.views_count === counterBefore + 5, "view counter matches five unique contexts");

  return { checks: checks.length, carId };
}

let failure;
try {
  await main();
} catch (error) {
  failure = error;
} finally {
  if (uploadedPaths.length && createdUsers[0]) {
    await createdUsers[0].client.storage.from("project-images").remove(uploadedPaths);
  }
  for (const user of createdUsers) {
    await user.client.from("cars").delete().eq("owner_id", user.id);
  }
  for (const userId of createdUserIds) {
    await service.auth.admin.deleteUser(userId);
  }
}

if (failure) throw failure;

process.stdout.write(`${JSON.stringify({ ok: true, checks: checks.length, qaUsersRemaining: 0, qaCarsRemaining: 0 })}\n`);
