# GEL Engenharia - Controle de Ferramentaria e Termos de Responsabilidade
### Obra: UHE Estrela

Sistema web corporativo para gestão de empréstimos, controle de ativos (com códigos de rastreamento TAG), ciclo de vida de manutenção de equipamentos (Ordens de Serviço de Consertos) e emissão de termos de responsabilidade assinados digitalmente.

---

## 🔗 Link de Acesso Online (GitHub Pages)

Acesse a versão de produção atualizada do sistema diretamente pelo link:
👉 **[https://eullon1234-creator.github.io/CONTROLE-DE-FERRAMENTAS-ESTRELA-GEL-/](https://eullon1234-creator.github.io/CONTROLE-DE-FERRAMENTAS-ESTRELA-GEL-/)**

---

## 🚀 Funcionalidades Principais

*   **Painel Dashboard**: Gráficos e indicadores com estatísticas rápidas de empréstimos e status do almoxarifado.
*   **Termos de Responsabilidade**: Emissão e assinatura digital (na tela) de novos empréstimos, com controle automático de saldo de ativos.
*   **Catálogo de Equipamentos**: Controle de ferramentas por TAG, descrição e status (Disponível, Emprestado, Em Manutenção).
*   **Gestão de Consertos (OS)**: Abertura automática de Ordens de Serviço (OS) ao enviar itens para conserto e atualização automática de status do ativo ao registrar o retorno.
*   **Importador de Excel**: Carga e sincronização rápida de dados das planilhas de Termos e do histórico de Consertos.

---

## 🛠️ Tecnologias Utilizadas

*   **Front-end**: React 19, Vite, Lucide React (Ícones).
*   **Banco de Dados & Autenticação**: Firebase Firestore & Firebase Authentication.
*   **Estilização**: Vanilla CSS (Premium Dark/Glassmorphism theme).
*   **Carga de Dados**: Biblioteca `xlsx` para leitura de planilhas locais.

---

## 💻 Desenvolvimento Local

Para rodar o projeto localmente em sua máquina, siga os passos abaixo:

1.  Instale as dependências:
    ```bash
    npm install
    ```
2.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```
3.  Abra o navegador em `http://localhost:5173/`.

---

## 🗄️ Carga de Dados (Scripts Node)

Para carregar os dados das planilhas do Excel diretamente no banco de dados do Firestore:

1.  Garanta que os arquivos de planilha estejam nos caminhos corretos:
    *   `TERMO_DE_RESPONSABILIDADE FF.xlsx`
    *   `OS_Conserto_separado.xlsx`
2.  Execute o script de carga de termos e equipamentos:
    ```bash
    node import_data.js
    ```
3.  Execute o script de carga do histórico de consertos:
    ```bash
    node import_os_data.js
    ```
