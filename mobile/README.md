# LOUVOR IEFF — código de iOS e Android

Esta pasta acrescenta um empacotamento Capacitor 8 ao projeto Next.js original.
Não altera o aplicativo web publicado. O executável usa arquivos HTML/CSS/JS
incluídos no pacote nativo: não carrega a página remota na abertura.

## Instalação (Node.js 22+)

A partir da raiz do repositório:

    npm ci
    cd mobile
    npm install
    npm test
    npm run web:export

Após gerar a pasta .mobile-stage/out:

    npx cap add android
    npx cap sync android
    npx cap open android

Para iOS, em um Mac com Xcode:

    npx cap add ios
    npx cap sync ios
    npx cap open ios

Android Studio: Build > Generate Signed Bundle / APK > Android App Bundle.
Crie um AAB assinado e teste no Google Play Console (teste interno).

Xcode: Signing & Capabilities > selecione Apple Team e identificador do bundle.
Product > Archive > Distribute App > App Store Connect / TestFlight.

Os diretórios mobile/android e mobile/ios serão gerados por cap add e
devem ser versionados após validar as configurações nativas.

## Interface, rotas e integrações preservadas

- Home; programação dos cultos; repertório; detalhes das músicas; cifras; ensaios;
  Modo Ministro; Culto ao Vivo; avisos; Spotify, YouTube e Cifra Club.
- Música e cifra aceitam identificadores dinâmicos em URLs estáticas com ?id=,
  incluindo músicas cadastradas depois da instalação.
- Programação e sessão ao vivo continuam sincronizadas pelas tabelas louvor_*
  existentes no Supabase (quando as variáveis públicas estiverem configuradas).
- Busca de versões mantém a API já publicada no Vercel; segredos de Spotify,
  YouTube e Supabase service role permanecem somente no servidor.
- Sem conexão, a UI embutida inicia e o armazenamento local segue disponível.
  Referências externas, pesquisas remotas e sincronização requerem internet.

## Variáveis de build

Defina as variáveis de ambiente NO PROCESSO QUE EXECUTA web:export
(não insira segredos privados no projeto mobile):

    NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=CHAVE_PUBLICA
    NEXT_PUBLIC_LOUVOR_API_BASE_URL=https://louvor-ieff.vercel.app

Confirme o nome exato das variáveis do Supabase no src/lib/supabase.ts do
projeto original. A URL da API de pesquisa usa o Vercel de produção como padrão.
O plugin CapacitorHttp encaminha a chamada por HTTP nativo para evitar CORS
do WebView local.

## Segurança antes de publicar

BLOQUEADOR DE LANÇAMENTO: o código web original utiliza PIN 2626 para o
ministro e políticas de escrita anônima no Supabase. Não publicar
amplamente sem substituir isso por Supabase Auth com perfil de ministro,
RLS restritiva, testes contra edição anônima e revogação de sessão.
Não basta esconder a rota ou alterar o PIN no front-end.

## Checklist final obrigatório

1. Confirmar que npm test e web:export passam na versão atual do repositório.
2. Gerar projetos nativos e validar Android físico e iPhone físico
   (rotas, links externos, offline, recompilação, Supabase e tempo real).
3. Configurar assinaturas, versionCode/CFBundleVersion, package/bundle ID,
   ícone oficial em alta definição, splash e capturas das lojas.
4. Definir política de privacidade, contato, classificação indicativa,
   titularidade/autorização da marca e notas de revisão.
5. Produzir AAB assinado e arquivo iOS/TestFlight, realizar testes e corrigir
   erros ANTES de solicitar revisão pública das lojas.
6. Validar utilidade específica da equipe de louvor para atender à regra 4.2
   da App Store; o uso de Capacitor não garante aprovação.

## Situação

Código-base de empacotamento e testes de transformação estão prontos neste
branch. Nenhum APK, AAB, IPA ou aprovação nas lojas foi confirmado aqui.
Não mesclar com main antes de build, autenticação e testes reais.
