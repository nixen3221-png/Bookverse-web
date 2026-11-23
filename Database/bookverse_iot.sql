CREATE DATABASE IF NOT EXISTS bookverse_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bookverse_db;

-- ==========================================================
-- MÓDULO BASE BOOKVERSE (ETAPA 2)
-- ==========================================================

CREATE TABLE proveedores (
  id INT(11) NOT NULL AUTO_INCREMENT,
  nombre_empresa VARCHAR(100) NOT NULL,
  contacto VARCHAR(100) DEFAULT NULL,
  telefono VARCHAR(20) DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE libros (
  id INT(11) NOT NULL AUTO_INCREMENT,
  titulo VARCHAR(150) NOT NULL,
  autor VARCHAR(100) NOT NULL,
  genero VARCHAR(50) DEFAULT NULL,
  precio DECIMAL(10,2) NOT NULL,
  stock_disponible INT(11) NOT NULL DEFAULT 0,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE pedidos_proveedores (
  id INT(11) NOT NULL AUTO_INCREMENT,
  libro_id INT(11) NOT NULL,
  proveedor_id INT(11) NOT NULL,
  cantidad INT(11) NOT NULL,
  estado_pedido VARCHAR(50) NOT NULL,
  fecha_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_pedidos_libro FOREIGN KEY (libro_id) REFERENCES libros(id),
  CONSTRAINT fk_pedidos_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
) ENGINE=InnoDB;

CREATE TABLE equipos_oficina (
  id INT(11) NOT NULL AUTO_INCREMENT,
  codigo_equipo VARCHAR(50) NOT NULL UNIQUE,
  tipo_equipo VARCHAR(50) NOT NULL,
  ubicacion VARCHAR(100) DEFAULT NULL,
  estado_operativo VARCHAR(50) DEFAULT 'Operativo',
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE mantenimiento_equipos (
  id INT(11) NOT NULL AUTO_INCREMENT,
  equipo_id INT(11) NOT NULL,
  tipo_mantenimiento VARCHAR(30) NOT NULL,
  descripcion TEXT,
  tecnico VARCHAR(100) DEFAULT NULL,
  estado_software VARCHAR(50) DEFAULT NULL,
  fecha_mantenimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_mantenimiento_equipo FOREIGN KEY (equipo_id) REFERENCES equipos_oficina(id)
) ENGINE=InnoDB;

-- ==========================================================
-- MÓDULO DE SENSORES IoT (ETAPA 3 - RF-10 / RF-11)
-- ==========================================================

CREATE TABLE sucursales (
  id INT(11) NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  ciudad VARCHAR(100) NOT NULL,
  direccion VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE sensores (
  id INT(11) NOT NULL AUTO_INCREMENT,
  codigo_sensor VARCHAR(20) NOT NULL UNIQUE,
  sucursal_id INT(11) NOT NULL,
  tipo_sensor VARCHAR(50) NOT NULL,
  ubicacion VARCHAR(100) NOT NULL,
  unidad_medida VARCHAR(20) NOT NULL,
  umbral_min DECIMAL(10,2) DEFAULT NULL,
  umbral_max DECIMAL(10,2) NOT NULL,
  estado_operativo VARCHAR(50) DEFAULT 'Normal',
  PRIMARY KEY (id),
  CONSTRAINT fk_sensores_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
) ENGINE=InnoDB;

CREATE TABLE registro_datos_sensores (
  id BIGINT(20) NOT NULL AUTO_INCREMENT,
  sensor_id INT(11) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_sensor_fecha (sensor_id, fecha_registro),
  CONSTRAINT fk_registro_sensor FOREIGN KEY (sensor_id) REFERENCES sensores(id)
) ENGINE=InnoDB;

-- ==========================================================
-- DATOS INICIALES DE SUCURSALES Y SENSORES
-- ==========================================================

INSERT INTO sucursales (nombre, ciudad, direccion) VALUES
('Sucursal Chillán', 'Chillán', 'Av. Libertad 450'),
('Sucursal Concepción', 'Concepción', 'Barros Arana 780');

INSERT INTO sensores (codigo_sensor, sucursal_id, tipo_sensor, ubicacion, unidad_medida, umbral_min, umbral_max) VALUES
('T-01', 1, 'Temperatura', 'Bodega', '°C', 15.00, 28.00),
('H-01', 1, 'Humedad', 'Bodega', '%', 0.00, 65.00),
('P-01', 1, 'Conteo de personas', 'Acceso principal', 'personas', 0.00, 40.00),
('T-02', 2, 'Temperatura', 'Bodega', '°C', 15.00, 28.00),
('H-02', 2, 'Humedad', 'Bodega', '%', 0.00, 65.00),
('P-02', 2, 'Conteo de personas', 'Acceso principal', 'personas', 0.00, 40.00);