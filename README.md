# Aimology

Laboratório de sensibilidade para Valorant, por João Pedro Lisboa. Aplicação funcional em português, com treino no navegador e recomendação baseada em desempenho. Projeto independente, sem vínculo com Riot Games, Oblivity, Aim Lab ou KovaaK's.

##Site disponivel 
https://jotapedz.github.io/Aimology/

## Executar

Requer Node.js 22 ou superior. Não é necessário instalar dependências.

```powershell
git clone https://github.com/jotapedz/Aimology.git
cd Aimology
node server.mjs
```

Abra http://127.0.0.1:4173 em um navegador de computador com mouse. Também pode executar `iniciar.cmd`, que procura o Node.js no PATH, nas pastas de instalação comuns e no runtime local do ChatGPT. Assim, o iniciador funciona mesmo quando esse runtime não está no PATH do Windows. Execute `iniciar.cmd --check` para verificar a localização e versão sem iniciar o servidor. Para testes: `node --test tests/*.test.mjs`.

## Publicação no GitHub Pages

O site é estático e está pronto na pasta `dist/`. Não há instalação de dependências nem etapa de build. O Node.js é usado apenas pelo servidor local e pelos testes; os visitantes acessam o site pelo navegador.

1. O código está em [jotapedz/Aimology](https://github.com/jotapedz/Aimology). Envie as alterações para a branch `main`.
2. No repositório, abra **Settings → Pages → Build and deployment → Source** e selecione **GitHub Actions**.
3. Em **Actions → Testes e deploy**, execute **Run workflow** na branch `main` se o primeiro envio ocorreu antes da configuração do Pages.
4. Quando a execução concluir, o endereço publicado aparece em **Settings → Pages** e no ambiente **github-pages**.

A automação roda os testes em pull requests e em cada envio para `main`. Apenas a branch `main` publica, e somente se todos os testes passarem. O artefato publicado contém exclusivamente `dist/`. O arquivo de configuração está em [.github/workflows/pages.yml](.github/workflows/pages.yml).

Os caminhos dos arquivos são relativos, compatíveis com a subpasta `/Aimology/` no Pages. Após a ativação e o primeiro deploy, o endereço esperado é https://jotapedz.github.io/Aimology/. O histórico fica no navegador e é separado por endereço: dados da versão local não aparecem automaticamente na versão publicada. Exporte os resultados antes de mudar de endereço, caso queira guardar uma cópia.

## Licença

Disponível sob a [licença MIT](LICENSE). Copyright © 2026 João Pedro Lisboa.

## Busca ampliada de sensibilidade

A configuração de novos diagnósticos começa na faixa ampla, com nove multiplicadores: 0,25 / 0,5 / 0,75 / 1 / 1,5 / 2 / 3 / 4 / 6. Ela inclui sensibilidades baixas e altas, mantém a atual entre os candidatos e conserva os limites de 0,01 a 5. Valores duplicados após arredondamento e limitação são removidos.

Cada candidato recebe as mesmas tarefas, repetições e duração. Sem valores duplicados, a faixa ampla gera 27 rodadas de triagem (6 min 45 s), 108 no completo (27 min) e 162 no aprofundado (54 min). Pausas e adaptação são adicionais. A tela recalcula os tempos e mostra sensibilidade, eDPI e cm/360° ao mudar a faixa ou o perfil.

A faixa próxima da atual (±30%) e o refinamento (±10%) continuam disponíveis. Sessões existentes não mudam. O método de pontuação e os critérios de qualidade são os mesmos; uma condição com coleta insuficiente continua tornando a indicação inconclusiva.

## Atualização v2

- Seis exercícios: flick amplo, microajuste, troca entre três alvos, clique em alvo móvel, tracking contínuo e tracking reativo.
- Protocolos com a faixa próxima/refinamento de cinco candidatos: triagem (15 × 15 s), completo (60 × 15 s) e aprofundado (90 × 20 s). A faixa ampla de nove candidatos usa as durações descritas acima.
- Métricas: precisão, acertos/s, aquisição mediana/P90, eficiência de caminho, ultrapassagens, erro angular, distribuição espacial do erro, desempenho por segundo e variação entre repetições.
- Qualidade da amostra: dados insuficientes e baixo FPS impedem recomendações automáticas. Alertas explicam cada condição.
- Histórico de treino livre, refinamento ±10% a partir da indicação e preservação de sessões v1.
- Interface mais sóbria com cores neutras, fontes do sistema, biblioteca em lista e relatórios em tabelas. Não depende de fontes externas.

## Fluxo

1. Em Configurações, informe o DPI real e a sensibilidade usada no Valorant.
2. Calibre o movimento: meça um deslocamento horizontal do mouse no mousepad. O fator corrige possíveis diferenças das unidades entregues pelo navegador.
3. Aqueça nos seis exercícios disponíveis, com 30, 60 ou 90 segundos de duração.
4. Escolha a faixa e faça a triagem, o completo ou o aprofundado. Confira na tela a quantidade de rodadas e o tempo calculado para a faixa selecionada. Nas bordas do intervalo permitido, candidatos duplicados são removidos e o número de rodadas pode diminuir.
5. Consulte a comparação, aplique a recomendação ao perfil e ajuste manualmente o Valorant. Repita o diagnóstico em outro dia ou refine a faixa.

## Implementação

- `dist/engine.js`: plano balanceado, gerador determinístico, conversão, projeção e análise pura.
- `dist/app.js`: interface, armazenamento, exportação, jogo Canvas 2D com projeção de câmera 3D, Pointer Lock, áudio e calibração.
- `dist/workspace.css`: interface responsiva com estados de foco e movimento reduzido.
- `dist/views.js`: telas e relatório detalhado, sem dependências.
- `dist/training.js`: cenários, movimento e coleta de métricas.
- `dist/legacy-engine.js`: contrato v1 para sessões já existentes.
- `server.mjs`: servidor HTTP local sem dependências, limitado à pasta `dist`.
- `tests/engine.test.mjs`: testes de recomendação, limites, fórmulas e geometria.

O mouse gira a câmera por deltas, não move um cursor absoluto. O motor adota yaw comunitário de 0,07° por unidade × sensibilidade e FOV de 103° horizontal em 16:9. O DPI entra no eDPI e cm/360°, não multiplica novamente o movimento. Pointer Lock solicita entrada sem aceleração com fallback quando o navegador sinaliza falta de suporte. A calibração é necessária para verificar a equivalência física; o navegador nem sempre confirma raw input.

## Método e limites

A faixa próxima compara fatores 0,7 / 0,85 / 1 / 1,15 / 1,3. A ampla usa os nove multiplicadores descritos acima. O refinamento compara 0,9 / 0,95 / 1 / 1,05 / 1,1. A ordem inicial é embaralhada e as posições dos candidatos são rotacionadas entre repetições. Cada tarefa e repetição compartilham a semente entre candidatos. Há três segundos de adaptação sem pontuação, e pausas sugeridas a cada dez rodadas.

Clique: acertos/s × raiz da precisão. Tracking: proporção de tempo no alvo. Médias por tarefa são normalizadas pelo melhor candidato. Pesos do completo e aprofundado: 20% flick, 20% microajuste, 20% troca, 15% clique móvel, 15% tracking contínuo, 10% reativo. Triagem mantém 40/40/20 nas três tarefas originais. São heurísticas, não um modelo validado de habilidade no Valorant.

A análise detalhada inclui aquisição mediana/P90, erro angular ponderado pelo tempo, distribuição de erro, eficiência e ultrapassagens heurísticas em alvos estáticos. Essas métricas descrevem o movimento; não são usadas para forçar uma suposta sensibilidade perfeita. A aquisição não é uma medida pura de reflexos.

Amostra mínima: média de cinco acertos por rodada em cada tarefa de clique; pelo menos 2% do tempo no alvo e movimento de 0,25 grau/s em cada rodada de tracking; coleta temporal completa; ao menos 45 FPS médios em cada rodada. Uma condição insuficiente torna toda a recomendação inconclusiva, preservando o relatório. Os limiares são mínimos heurísticos.

Diferenças de até cinco pontos formam uma faixa próxima, que favorece o valor mais perto da sensibilidade inicial. Consistência exige pelo menos duas repetições, mesmo líder em todas, margem maior que cinco pontos e variação do líder até 15%. Variação é desvio padrão populacional dividido pela média; não é confiança estatística. Aprendizagem, cansaço e conforto ainda devem ser avaliados em outra sessão e no jogo.

Esc, perda de foco, troca de aba e intervalos longos de renderização pausam o cronômetro. Rodadas completas são salvas. A rodada interrompida é reiniciada se a sessão for reaberta. Sessões v1 continuam com o motor e análise originais; o histórico não é recalculado como v2.

As chaves internas `iamira.*` foram mantidas para preservar dados locais de versões anteriores após a mudança de nome. Dados em localStorage, por origem, com limite de 100 diagnósticos e 150 treinos, sujeitos à quota do navegador. Exportação JSON contém condições e métricas. Se o histórico não puder ser gravado, a sessão concluída não é removida da recuperação. Sem backend, conta do jogo, telemetria externa ou fontes remotas. Não simula ADS, recuo, movimentação do personagem ou latência do Valorant.

## Referências

- https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API
- https://www.w3.org/TR/pointerlock/
- https://github.com/Pratilectron/valotrainer

## Verificação

Os testes automatizados verificam fórmulas, balanceamento, rotação de ordem, repetibilidade, empates, qualidade da amostra, versões antigas, trajetórias, captura de métricas, relatórios e fluxo completo usando substitutos de DOM/canvas. A validação de fluxo não substitui um teste visual ou de entrada real no navegador. Validação física de cm/360° e melhora em partidas depende do mouse e dos testes do jogador. O resultado não foi validado em estudo com usuários.
