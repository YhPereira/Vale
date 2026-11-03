# 🛠️ Sistema de Mapeamento e Localização Rápida de Ativos — Vale

## 📌 Problema que o Projeto Resolve
Nas operações industriais e pátios da Vale, a perda de tempo na busca por peças, ferramentas e insumos de manutenção gera paradas não programadas e gargalos na rotina operacional. Este sistema centraliza a consulta de localização física em tempo real (galpão, prateleira, armário), status de disponibilidade e histórico de movimentação dos ativos.

---

## 🖼️ Interface do Sistema (Tela Principal)

![Tela Principal - Dashboard Vale](https://via.placeholder.com/900x450?text=Print+da+Tela+Principal+-+Dashboard+Vale)
*Exemplo da interface responsiva do painel corporativo rodando em ambiente desktop e mobile.*

---

## 🌐 Lista de Telas do Sistema
* **Início (`home.html`):** Dashboard principal com busca rápida de ativos, mapa do almoxarifado e indicadores do inventário.
* **Pesquisar (`pesquisar.html`):** Tabela de consulta detalhada com filtros por categoria, estado e localização exata do item.
* **Leitura de Código (`leitura.html`):** Interface simulada do leitor óptico/câmera para identificação rápida por código de patrimônio ou QR Code.
* **Histórico (`historico.html`):** Registro de auditoria contendo saídas, devoluções e envios para manutenção.
* **Sobre (`sobre.html`):** Página de apresentação dos desenvolvedores da equipe com competências e redes sociais.
* **Ajuda (`ajuda.html`):** Central de suporte ao usuário no formato de FAQ interativo com tutoriais passo a passo.

---

## 🛠️ Tecnologias Utilizadas
* **HTML5 Semântico:** Estruturação acessível com uso de tags nativas (`<header>`, `<nav>`, `<main>`, `<details>`, `<summary>`, `<footer>`).
* **CSS3 Flexbox & Design System Vale:** Layout 100% responsivo com variáveis de cores oficiais (`#007E7A` e `#ECB11F`) e tipografia institucional.
* **CSS Puro para Interatividade:** Menu hambúrguer mobile responsivo construído sem dependência de bibliotecas ou JavaScript externo.

---

## 🚀 Passo a Passo para Rodar na Sua Máquina

1. **Clonar o Repositório:**
   ```bash
   git clone https://github.com/usuario/desafio-vale-ativos.git
   ```
2. **Acessar a pasta do projeto:**
   ```bash
   cd desafio-vale-ativos
   ```
3. **Executar no Navegador:**
   * Abra a pasta no seu gerenciador de arquivos e dê um duplo clique em `home.html`.
   * **Alternativa recomendada:** Abra a pasta no **VS Code** e utilize a extensão **Live Server** clicando em *"Go Live"*.

---

## 👥 Quem Fez o Quê (Divisão de Tarefas)

* **Yuri Honorato (Back-end Developer):**
  * Modelagem conceitual da estrutura de dados dos ativos (`Código PAT`, `Status`, `Localização`).
  * Construção das páginas `historico.html` e `leitura.html`.
  * Criação da documentação oficial do repositório (`README.md`).

* **Filipe (Front-end Developer):**
  * Arquitetura do Design System Vale no `style.css` (Cores, Fontes e Acessibilidade).
  * Desenvolvimento da estrutura responsiva das páginas `home.html`, `pesquisar.html`, `sobre.html` e `ajuda.html`.
  * Implementação do menu hambúrguer mobile e adequação para telas pequenas (Ajuste Viewport).

---

## 📊 Status do Projeto (O que já funciona)

- [x] Layout 100% responsivo (ajustado para telas a partir de **360px**).
- [x] Menu de navegação dinâmico com indicação da página ativa (`aria-current="page"`).
- [x] Busca e visualização de itens nas tabelas de consulta.
- [x] Interface de simulação de leitura de código/QR Code.
- [x] Tabela de auditoria no Histórico de movimentações.
- [x] Central de Ajuda interativa com sanfonas `<details>` e tutoriais numerados.
- [x] Validação de acessibilidade por navegação via teclado (`Tab` e `:focus-visible`).