CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    amount NUMERIC(10, 2) NOT NULL,
    category VARCHAR(50) NOT NULL, -- Tea Counter, Restaurant, Online
    sub_category VARCHAR(50) NOT NULL, -- UPI, Cash, Card, Swiggy, Zomato
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE
);
