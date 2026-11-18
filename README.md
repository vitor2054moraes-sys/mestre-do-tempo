# Ritmo — tempo, treinos e estudos

**Ritmo** (antes "Mestre do Tempo") junta tudo o que mede o seu tempo e organiza a sua semana — no compasso certo.
Feito em HTML, CSS e JavaScript puro, sem dependências; funciona no navegador e os dados ficam no aparelho.

## O que faz

- **Relógio** em tempo real e **relógio mundial** (São Paulo, Nova York, Londres, Tóquio, Dubai, Sydney).
- **Cronômetro** com voltas e **regressivo** com aviso por voz.
- **HIIT:** tiros e descanso por ciclos, com bipe e voz em cada troca.
- **Despertador.**
- **Rotina de treinos** (30+ esportes) e **de estudos** (matérias e 15 idiomas) por dia da semana; marque o que fez hoje.
- **Calendário** dos dias ativos, **ofensiva** (dias seguidos) com o recorde e estatísticas do mês.

## O que mudou nesta versão

- **Tempos certos com a tela bloqueada:** regressivo e HIIT contam pela hora do aparelho (antes contavam "um segundo
  por vez", e o navegador desacelera isso com a tela bloqueada).
- **Despertador confiável:** toca quando a hora chega ou já passou — antes só tocava se o aparelho olhasse a hora
  exatamente no segundo 00, o que podia não acontecer.
- **Som que não para:** um canal de áudio só, reaproveitado (antes cada bipe abria um novo e o navegador acabava
  recusando).
- **Segurança:** a tela é montada pelo DOM (o nome de uma atividade entra como texto, nunca como código); a página só
  carrega arquivos dela mesma (Content-Security-Policy); dado estragado no navegador não trava nada.
- **Visual:** cores lisas, abas que rolam para o lado no celular e ficam presas no alto, calendário com botões grandes.
- Separado em `index.html`, `style.css` e `app.js`. Os dados salvos continuam (as mesmas chaves).

## Acesse

[Abrir o app](https://vitor2054moraes-sys.github.io/mestre-do-tempo/)

## Tecnologias

HTML5 · CSS3 · JavaScript (sem framework) · Web Audio API · SpeechSynthesis · LocalStorage
