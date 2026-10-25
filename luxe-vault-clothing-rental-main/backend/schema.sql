CREATE DATABASE IF NOT EXISTS luxevault;
USE luxevault;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address VARCHAR(255),
  role ENUM('customer','admin') DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  subject VARCHAR(150),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clothes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL,
  gender VARCHAR(20) NOT NULL,
  size VARCHAR(10) NOT NULL,
  color VARCHAR(50) NOT NULL,
  rental_price INT NOT NULL,
  security_deposit INT NOT NULL,
  availability ENUM('Available','Rented') DEFAULT 'Available',
  rating DECIMAL(2,1) DEFAULT 5.0,
  reviews_count INT DEFAULT 0,
  image VARCHAR(500),
  images JSON,
  description TEXT,
  features JSON
);

-- Rental ids start at 1001 so they display as RNT-1001, RNT-1002, ...
CREATE TABLE IF NOT EXISTS rentals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  clothing_id INT NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(20),
  delivery_address VARCHAR(255),
  start_date DATE NOT NULL,
  return_date DATE NOT NULL,
  rental_days INT NOT NULL,
  daily_rate INT NOT NULL,
  rental_cost INT NOT NULL,
  security_deposit INT NOT NULL,
  total_amount INT NOT NULL,
  rental_status ENUM('Confirmed','Active','Returned','Cancelled') DEFAULT 'Confirmed',
  payment_status ENUM('Pending','Paid') DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (clothing_id) REFERENCES clothes(id)
) AUTO_INCREMENT = 1001;

-- Payment ids start at 9001 so they display as PAY-9001, ...
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rental_id INT NOT NULL,
  user_id INT NOT NULL,
  amount INT NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'Completed',
  transaction_id VARCHAR(40) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) AUTO_INCREMENT = 9001;
