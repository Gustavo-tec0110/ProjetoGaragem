# Editor de imagens do perfil — auditoria e validação

## Diagnóstico

- O editor anterior usava apenas um slider e arraste de um ponteiro. Não havia pinça, roda do mouse, botões de zoom nem movimentação por teclado.
- O zoom alterava a escala em torno do centro sem ancorar o ponto sob o cursor ou gesto. A posição podia parecer saltar ao combinar zoom e deslocamento.
- A prévia temporária podia falhar quando a URL de objeto era revogada durante o ciclo de efeitos do React em desenvolvimento.
- A geometria de tela e a exportação eram calculadas dentro do componente, dificultando verificar que o arquivo WebP correspondia à prévia.
- Não era possível trocar o arquivo com o editor aberto.

## Resultado

O recorte usa a mesma geometria proporcional na prévia e no canvas de exportação. O avatar é exportado em 512 × 512 com guia circular; a capa, em 1500 × 500 (3:1). O editor limita o deslocamento para evitar áreas vazias, aceita arraste, pinça, roda, slider, botões e teclado, e reinicia o enquadramento ao trocar de imagem. O fluxo existente de upload e gravação do perfil não foi alterado.

A capa pública tem altura responsiva independente da proporção do arquivo. O editor informa que pode haver corte adicional no cabeçalho.

## Evidências visuais

As capturas abaixo usam uma imagem de teste com cores diferentes nas bordas e no centro:

| Cenário | Antes | Depois |
| --- | --- | --- |
| Avatar desktop | [Inicial](screenshots/profile-editor-avatar-before.png) | [Zoom e arraste](screenshots/profile-editor-avatar-after.png) |
| Capa desktop | [Inicial](screenshots/profile-editor-cover-before.png) | [Zoom e arraste](screenshots/profile-editor-cover-after.png) |
| Toque mobile | — | [Avatar após pinça](screenshots/profile-editor-avatar-mobile-pinch.png), [capa após pinça](screenshots/profile-editor-cover-mobile-pinch.png) |

## Testes executados

- `npm run typecheck`: passou.
- ESLint dos arquivos alterados: passou.
- `npm run build`: passou.
- Playwright contra build de produção local: 7 passaram, 3 saltados por serem específicos do outro tipo de dispositivo. Cobertura: geometria, seleção, slider, botões, roda, arraste, limites, reset, cancelamento, troca de arquivo, exportação e pinça/arraste por toque em avatar e capa.
- Teste de arquivo ilegível: passou no desktop e no mobile.
- O E2E compara amostras de pixels da prévia com o WebP exportado e verifica dimensões, proporção e ausência de transparência nas bordas.
- O monitor de runtime da suíte não registrou erros de console ou página nos cenários aprovados.

## Limitação do ambiente

Não havia URL pública do Supabase nem contas E2E configuradas neste workspace. Por isso, o upload autenticado e a persistência após recarregar um perfil real não puderam ser executados. O teste de navegador usa o componente de produção em uma rota de teste protegida por `PROFILE_IMAGE_EDITOR_TEST_HARNESS=1`, com o arquivo exportado exibido localmente.
