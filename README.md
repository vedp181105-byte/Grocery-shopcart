# 🌿 Indian Grocery Store
### Full-Stack: Node.js + Express + MongoDB

---

## 📁 Project Structure

```
grocery-shop/
├── server.js              ← Express entry point
├── .env                   ← MongoDB URI (edit this!)
├── package.json
├── config/db.js           ← Mongoose connection
├── models/
│   ├── Product.js         ← Products schema
│   ├── Order.js           ← Orders schema
│   ├── User.js            ← Users schema (with password hashing)
│   └── Contact.js         ← Contact messages schema
├── routes/api.js          ← All REST API endpoints
├── data/products.js       ← All product seed data
├── scripts/seed.js        ← Seed products into MongoDB
└── public/
    ├── index.html         ← Same UI as original
    └── js/app.js          ← Frontend (calls API)
```

---

## 🚀 Setup in 4 Steps

### 1. Install dependencies
```bash
npm install
```

### 2. Configure MongoDB in `.env`
```env
# Local MongoDB:
MONGO_URI=mongodb://localhost:27017/indian_grocery

# OR MongoDB Atlas:
MONGO_URI=mongodb+srv://vedang:vedu1808@cluster0.motpd9d.mongodb.net/indian_grocery
```

### 3. Seed products
```bash
npm run seed
```

### 4. Start
```bash
npm run dev      # development (auto-restart)
npm start        # production
```

**Open → http://localhost:3000**

---

## 🗄️ What Saves to MongoDB

| Action | MongoDB Collection |
|--------|--------------------|
| Place Order | `orders` ✅ |
| Register / Login | `users` ✅ |
| Contact form submit | `contacts` ✅ |
| Cart & Wishlist | `sessions` ✅ (via connect-mongo) |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | All products (`?cat=&sort=&q=`) |
| GET | `/api/products/featured` | Featured products |
| GET | `/api/products/:id` | Single product |
| GET | `/api/cart` | Get cart |
| POST | `/api/cart` | Add to cart |
| PUT | `/api/cart/:id` | Update qty |
| DELETE | `/api/cart/:id` | Remove item |
| GET | `/api/wishlist` | Get wishlist |
| POST | `/api/wishlist/:id` | Toggle wishlist |
| POST | `/api/orders` | Place order |
| GET | `/api/orders` | All orders |
| PATCH | `/api/orders/:inv/cancel` | Cancel order |
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/contact` | Submit contact form |

---

## ✔ Verify in MongoDB

```bash
mongosh
use indian_grocery
db.orders.find().pretty()     # placed orders
db.users.find().pretty()      # registered users
db.contacts.find().pretty()   # contact messages
db.products.count()           # should be 100+
```
