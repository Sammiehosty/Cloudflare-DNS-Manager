-- Cloudflare Manager Database Schema
-- Database name: sammarle_cf
-- User: sammarle_cf

CREATE DATABASE IF NOT EXISTS `sammarle_cf` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `sammarle_cf`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `website` VARCHAR(255) NOT NULL,
  `cf_token` TEXT NOT NULL,
  `zone_id` VARCHAR(64) NOT NULL COMMENT 'Cloudflare Zone ID (32 char hex)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_website` (`website`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `admin_config` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `password` VARCHAR(255) NOT NULL DEFAULT 'admin123',
  `theme` VARCHAR(10) DEFAULT 'light',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default admin password
INSERT INTO `admin_config` (`id`, `password`) VALUES (1, 'admin123')
ON DUPLICATE KEY UPDATE `password` = VALUES(`password`);

-- You can add a sample user for testing (remove in production)
-- INSERT INTO `users` (`name`, `website`, `cf_token`, `zone_id`) VALUES 
-- ('Test Client', 'example.com', 'your_cf_token_here', 'your_zone_id_here');