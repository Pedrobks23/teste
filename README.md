# Sistema de Reservas de Restaurante

Este projeto fornece um exemplo simples de aplicação web para gerenciar clientes, mesas e reservas de um restaurante. O backend utiliza **Node.js** com **Express** e banco de dados **SQLite**. A interface é composta por algumas páginas HTML/JS disponíveis na pasta `public/`.

## Instalação

Requisitos: Node.js 18 ou superior.

Instale as dependências:

```bash
npm install
```

Para iniciar em modo desenvolvimento (com `nodemon`):

```bash
npm run dev
```

Ou para rodar normalmente:

```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`.

## Endpoints principais

- `GET /clientes` – lista todos os clientes
- `POST /clientes` – cadastra um cliente
- `PUT /clientes/:id` – edita um cliente
- `DELETE /clientes/:id` – remove um cliente

- `GET /mesas` – lista todas as mesas
- `POST /mesas` – cadastra uma mesa
- `PUT /mesas/:id` – edita uma mesa
- `DELETE /mesas/:id` – remove uma mesa

- `GET /reservas` – lista reservas ordenadas por data/hora
- `POST /reservas` – cria uma reserva (verifica conflitos)
- `PUT /reservas/:id` – edita uma reserva
- `DELETE /reservas/:id` – remove uma reserva

A pasta `public/` contém páginas HTML simples para testar o funcionamento do sistema diretamente pelo navegador.
