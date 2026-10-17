import console from "node:console";
import process from "node:process";

// Identificador observado no bundle do site público em 13/10/2026.
// Este verificador aceita somente um projeto isolado, nunca este ref.
const BLOCKED_REF = "hxqhudfzdwfxnjzmphya";
const ref = process.env.QA_EXPECTED_PROJECT_REF?.trim();
const rawUrl = process.env.QA_SUPABASE_URL?.trim();
const anonKey = process.env.QA_SUPABASE_ANON_KEY?.trim();
const serviceKey = process.env.QA_SUPABASE_SERVICE_KEY?.trim();

function fail(message) {
  console.error(`Pré-verificação recusada: ${message}`);
  process.exitCode = 1;
}

if (!ref || !/^[a-z0-9]{20}$/.test(ref) || ref === BLOCKED_REF) {
  fail("informe o ref de um projeto de teste novo e diferente do ref legado.");
} else if (rawUrl !== `https://${ref}.supabase.co`) {
  fail("a URL deve corresponder exatamente ao ref de teste esperado.");
} else if (!anonKey || !serviceKey || anonKey === serviceKey) {
  fail("informe as chaves pública e de serviço distintas do projeto de teste.");
} else {
  try {
    const response = await globalThis.fetch(`${rawUrl}/auth/v1/admin/users?page=1&per_page=1`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      signal: globalThis.AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      fail("a chave de serviço não foi aceita pelo Auth no projeto informado.");
    } else {
      console.log(`Pré-verificação de leitura aprovada para o projeto de teste ${ref}.`);
      console.log("Confirme também no Dashboard que este ref pertence ao projeto descartável antes de qualquer escrita.");
    }
  } catch {
    fail("não foi possível consultar o Auth do projeto de teste.");
  }
}
