const bcrypt = require("bcryptjs");

async function initializeDB(pool) {

  const createMetaOptions = `
  CREATE TABLE IF NOT EXISTS Meta_Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('departament','specializare','firma') NOT NULL,
    name VARCHAR(150) NOT NULL,
    color_hex CHAR(7) DEFAULT '#FFFFFF',
    UNIQUE KEY uniq_type_name (type, name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;
  await pool.execute(createMetaOptions);

  const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    limba VARCHAR(20) NOT NULL DEFAULT 'RO',
    email VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,

    firma_id INT NULL,
    departament_id INT NULL,
    specializare_id INT NULL,

    password VARCHAR(255) NOT NULL,
    telephone VARCHAR(20),
    telephone_1 VARCHAR(20),
    telefon_prefix VARCHAR(10),
    telefon_prefix_1 VARCHAR(10),
    data_nastere DATE,
    role ENUM('ofertant', 'angajat', 'beneficiar') NOT NULL DEFAULT 'angajat',
    photo_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_users_firma_id (firma_id),
    INDEX idx_users_departament_id (departament_id),
    INDEX idx_users_specializare_id (specializare_id),

    CONSTRAINT fk_users_firma
      FOREIGN KEY (firma_id) REFERENCES Meta_Users(id)
      ON DELETE SET NULL ON UPDATE CASCADE,

    CONSTRAINT fk_users_departament
      FOREIGN KEY (departament_id) REFERENCES Meta_Users(id)
      ON DELETE SET NULL ON UPDATE CASCADE,

    CONSTRAINT fk_users_specializare
      FOREIGN KEY (specializare_id) REFERENCES Meta_Users(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;
  await pool.execute(createUsersTable);
  console.log("meta_options + users created (fresh).");

  //push notificaitons table
  const pushTable = `
  CREATE TABLE IF NOT EXISTS User_Push_Tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(512) NOT NULL,
    platform ENUM('ios','android') DEFAULT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uniq_user_token (user_id, token),
    KEY idx_user (user_id)
  );`;
  await pool.execute(pushTable);
  console.log("User_Push_Tokens table created or already exists.\n");

  //Tabele Manopera
  //
  //
  const createManoperaDEFTableQuery = `
      CREATE TABLE IF NOT EXISTS Manopera_Definition (
        id INT AUTO_INCREMENT PRIMARY KEY,
        limba VARCHAR(20) NOT NULL DEFAULT 'RO',
        cod_definitie VARCHAR(100) NOT NULL,   
        ocupatie TEXT NOT NULL,                       
        ocupatie_fr TEXT,
        descriere TEXT,
        descriere_fr TEXT,
        unitate_masura VARCHAR(20) NOT NULL,
        cost_unitar DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
        data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_limba (limba),
        INDEX idx_cod_definitie (cod_definitie),
        INDEX idx_ocupatie (ocupatie(100)),
        INDEX idx_ocupatie_fr (ocupatie_fr(100))
      );
    `;
  await pool.execute(createManoperaDEFTableQuery);
  console.log("Manopera_Definition table created or already exists.");

  const createManoperaTableQuery = `
    CREATE TABLE IF NOT EXISTS Manopera (
      id INT AUTO_INCREMENT PRIMARY KEY,
      definitie_id INT NOT NULL,
      cod_manopera VARCHAR(255) NOT NULL,
      descriere TEXT,
      descriere_fr TEXT,
      cost_unitar DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
      cantitate DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
      data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (definitie_id) REFERENCES Manopera_Definition(id),
      INDEX idx_cod_manopera (cod_manopera),
      INDEX idx_descriere (descriere(100)),
      INDEX idx_descriere_fr (descriere_fr(100))
    );
  `;
  await pool.execute(createManoperaTableQuery);
  console.log("Manopera table created or already exists.\n");
  //
  //
  //

  //Tabele Transport
  //
  const createTransportDefinitionTableQuery = `
    CREATE TABLE IF NOT EXISTS Transport_Definition (
      id INT AUTO_INCREMENT PRIMARY KEY,
      limba VARCHAR(20) NOT NULL DEFAULT 'RO',
      cod_definitie VARCHAR(100) NOT NULL,   
      clasa_transport VARCHAR(255) NOT NULL,
      transport TEXT NOT NULL,
      transport_fr TEXT,
      descriere TEXT,
      descriere_fr TEXT,
      unitate_masura VARCHAR(20) NOT NULL,
      cost_unitar DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
      data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      INDEX idx_limba (limba),
      INDEX idx_cod_definitie (cod_definitie),
      INDEX idx_clasa_transport (clasa_transport),
      INDEX idx_transport (transport(100)),
      INDEX idx_transport_fr (transport_fr(100))
    );
  `;
  await pool.execute(createTransportDefinitionTableQuery);
  console.log("Transport_Definition table created or already exists.");

  const createTransportTableQuery = `
    CREATE TABLE IF NOT EXISTS Transport (
      id INT AUTO_INCREMENT PRIMARY KEY,
      definitie_id INT NOT NULL,
      cod_transport VARCHAR(255) NOT NULL,
      descriere TEXT,
      descriere_fr TEXT,
      cost_unitar DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
      data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (definitie_id) REFERENCES Transport_Definition(id),
      INDEX idx_cod_transport (cod_transport),
      INDEX idx_descriere (descriere(100)),
      INDEX idx_descriere_fr (descriere_fr(100))
      );   
  `;
  await pool.execute(createTransportTableQuery);
  console.log("Transport table created or already exists.\n");
  //
  //
  //

  //Tabele Materiale
  //
  //
  const createMaterialeDEFTableQuery = `
    CREATE TABLE IF NOT EXISTS Materiale_Definition (
      id INT AUTO_INCREMENT PRIMARY KEY,
      limba VARCHAR(20) NOT NULL DEFAULT 'RO',
      photoUrl TEXT NOT NULL,
      clasa_material VARCHAR(255) NOT NULL,
      cod_definitie VARCHAR(100) NOT NULL,  
      tip_material VARCHAR(50) NOT NULL, 
      denumire VARCHAR(255) NOT NULL,               
      denumire_fr VARCHAR(255),
      descriere TEXT,
      descriere_fr TEXT,
      unitate_masura VARCHAR(50) NOT NULL,
      cost_unitar DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
      cost_preferential DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
      pret_vanzare DECIMAL(10, 3) NOT NULL DEFAULT 0.000,

      data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      INDEX idx_limba (limba),
      INDEX idx_denumire (denumire(100)),
      INDEX idx_denumire_fr (denumire_fr(100)),
      INDEX idx_cod_definitie (cod_definitie),
      INDEX idx_descriere (descriere),
      INDEX idx_descriere_fr (descriere_fr)
      );
    `;
  await pool.execute(createMaterialeDEFTableQuery);
  console.log("Materiale_Definition table created or already exists.");

  const createMaterialeTableQuery = `
    CREATE TABLE IF NOT EXISTS Materiale (
      id INT AUTO_INCREMENT PRIMARY KEY,
      definitie_id INT NOT NULL,
      cod_material VARCHAR(255) NOT NULL,
      furnizor VARCHAR(255) NOT NULL,
      descriere TEXT,
      descriere_fr TEXT,
      photoUrl TEXT NOT NULL,
      cost_unitar DECIMAL(10, 3) NOT NULL,
      cost_preferential DECIMAL(10, 3),
      pret_vanzare DECIMAL(10, 3) NOT NULL,
      data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (definitie_id) REFERENCES Materiale_Definition(id),
      INDEX idx_cod_material (cod_material),
      INDEX idx_descriere (descriere(100))
    );
  `;
  await pool.execute(createMaterialeTableQuery);
  console.log("Materiale table created or already exists.\n");
  //
  //
  //

  //Tabele Utilaje
  //
  //
  const createUtilajeDefinitionTableQuery = `
  CREATE TABLE IF NOT EXISTS Utilaje_Definition (
    id INT AUTO_INCREMENT PRIMARY KEY,
    limba VARCHAR(20) NOT NULL DEFAULT 'RO',
    cod_definitie VARCHAR(100) NOT NULL,  
    clasa_utilaj VARCHAR(255) NOT NULL,
    utilaj TEXT NOT NULL, 
    utilaj_fr TEXT,
    descriere TEXT,
    descriere_fr TEXT,
    photoUrl TEXT NOT NULL,
    unitate_masura VARCHAR(50) NOT NULL,
    cost_amortizare DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
    pret_utilaj DECIMAL(10, 3) NOT NULL DEFAULT 0.000,

    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_limba (limba),
    INDEX idx_cod_definitie (cod_definitie),
    INDEX idx_clasa_utilaj (clasa_utilaj),
    INDEX idx_utilaj (utilaj(100)),
    INDEX idx_utilaj_fr (utilaj_fr(100)),
    INDEX idx_descriere (descriere(100)),
    INDEX idx_descriere_fr (descriere_fr(100))
  );
`;
  await pool.execute(createUtilajeDefinitionTableQuery);
  console.log("Utilaje_Definition table created or already exists.");

  const createUtilajeTableQuery = `
  CREATE TABLE IF NOT EXISTS Utilaje (
    id INT AUTO_INCREMENT PRIMARY KEY,
    definitie_id INT NOT NULL,
    cod_utilaj VARCHAR(255) NOT NULL,
    furnizor VARCHAR(255) NOT NULL,
    descriere TEXT,
    descriere_fr TEXT,
    photoUrl TEXT NOT NULL,
    status_utilaj VARCHAR(255) NOT NULL,
    cantitate DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
    cost_amortizare DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
    pret_utilaj DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (definitie_id) REFERENCES Utilaje_Definition(id),
    INDEX idx_cod_utilaj (cod_utilaj),
    INDEX idx_furnizor (furnizor(100)),
    INDEX idx_status_utilaj (status_utilaj),
    INDEX idx_descriere (descriere(100))
  );
`;
  await pool.execute(createUtilajeTableQuery);
  console.log("Utilaje table created or already exists.\n");
  //
  //
  //

  //
  //
  // CREATE RETETE TABLE !!
  const createReteteTableQuery = `
    CREATE TABLE IF NOT EXISTS Retete (
      id INT AUTO_INCREMENT PRIMARY KEY,
      limba VARCHAR(20) NOT NULL DEFAULT 'RO',
      cod_reteta VARCHAR(255) NOT NULL,
      clasa_reteta VARCHAR(255) NOT NULL,
      articol TEXT NOT NULL,
      articol_fr TEXT,
      descriere_reteta TEXT,
      descriere_reteta_fr TEXT,
      unitate_masura VARCHAR(255) NOT NULL,
      INDEX idx_cod_reteta (cod_reteta),
      INDEX idx_clasa_reteta (clasa_reteta),
      INDEX idx_articol (articol(100)),
      index idx_articol_fr (articol_fr(100)),
      INDEX idx_limba (limba),
      data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.execute(createReteteTableQuery);
  console.log("Retete table created or already exists.");

  const createReteteManoperaTableQuery = `
    CREATE TABLE IF NOT EXISTS Retete_manopera (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reteta_id INT NOT NULL,
      manopera_definitie_id INT NOT NULL,
      UNIQUE (reteta_id, manopera_definitie_id),
      cantitate DECIMAL(10, 3) NOT NULL,
      FOREIGN KEY (reteta_id) REFERENCES Retete(id),
      FOREIGN KEY (manopera_definitie_id) REFERENCES Manopera_Definition(id)
    );


  `;
  await pool.execute(createReteteManoperaTableQuery);
  console.log("Retete_Manopera table created or already exists.");

  const createReteteTransportTableQuery = `
    CREATE TABLE IF NOT EXISTS Retete_transport (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reteta_id INT NOT NULL,
      transport_definitie_id INT NOT NULL,
      UNIQUE (reteta_id, transport_definitie_id),
      cantitate DECIMAL(10, 3) NOT NULL,
      FOREIGN KEY (reteta_id) REFERENCES Retete(id),
      FOREIGN KEY (transport_definitie_id) REFERENCES Transport_Definition(id)
    );
`;
  await pool.execute(createReteteTransportTableQuery);
  console.log("Retete_Transport table created or already exists.");

  const createReteteMaterialeTableQuery = `
    CREATE TABLE IF NOT EXISTS Retete_materiale (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reteta_id INT NOT NULL,
      materiale_definitie_id INT NOT NULL,
      UNIQUE (reteta_id, materiale_definitie_id),
      cantitate DECIMAL(10, 3) NOT NULL,
      FOREIGN KEY (reteta_id) REFERENCES Retete(id),
      FOREIGN KEY (materiale_definitie_id) REFERENCES Materiale_Definition(id)
    );
  `;
  await pool.execute(createReteteMaterialeTableQuery);
  console.log("Retete_Materiale table created or already exists.");

  const createReteteUtilajeTableQuery = `
    CREATE TABLE IF NOT EXISTS Retete_utilaje (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reteta_id INT NOT NULL,
      utilaje_definitie_id INT NOT NULL,
      UNIQUE (reteta_id, utilaje_definitie_id),
      cantitate DECIMAL(10, 3) NOT NULL,
      FOREIGN KEY (reteta_id) REFERENCES Retete(id),
      FOREIGN KEY (utilaje_definitie_id) REFERENCES Utilaje_Definition(id)
    );
  `;
  await pool.execute(createReteteUtilajeTableQuery);
  console.log("Retete_Utilaje table created or already exists.");

  const createSantiereTableQuery = `
    CREATE TABLE IF NOT EXISTS Santiere (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      color_hex CHAR(7) NOT NULL DEFAULT '#FFFFFF',
      user_id INT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.execute(createSantiereTableQuery);
  console.log("Santiere table created or already exists.");

  const createSantiereDetailsTableQuery = `
  CREATE TABLE IF NOT EXISTS Santiere_detalii (
    id INT AUTO_INCREMENT PRIMARY KEY,
    beneficiar VARCHAR(255) DEFAULT '...',
    longitudine varchar(255) DEFAULT '',
    latitudine varchar(255)  DEFAULT '',
    adresa VARCHAR(255) DEFAULT '...',
    email VARCHAR(255) DEFAULT '...',
    telefon VARCHAR(50) DEFAULT '...',
    aprobatDe VARCHAR(255) DEFAULT '...',
    creatDe VARCHAR(255) DEFAULT '...',
    detalii_executie TEXT,
    santier_id INT NOT NULL ,
    FOREIGN KEY (santier_id) REFERENCES Santiere(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;
  await pool.execute(createSantiereDetailsTableQuery);
  console.log("Santiere details table created or already exists.");
  //
  //
  //

  //
  //
  //
  // CREATE SANTIERE TABLES
  // Santier_retete
  const createOfertaReteteTable = `
    CREATE TABLE IF NOT EXISTS Oferta (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,  
        santier_id INT NOT NULL,  
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (santier_id) REFERENCES Santiere(id) 
    );
  `;
  await pool.execute(createOfertaReteteTable);
  console.log("Santier_Oferta table created or already exists.");

  const createOfertaPartsReteteTable = `
  CREATE TABLE IF NOT EXISTS Oferta_Parts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,  
      oferta_id INT NOT NULL,  
      reper1 Varchar(255) NOT NULL default 'reper1',
      reper2 Varchar(255) NOT NULL default 'reper2',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (oferta_id) REFERENCES Oferta(id) 
  );
`;

  await pool.execute(createOfertaPartsReteteTable);
  console.log("Santier_Oferta_Parts table created or already exists.");

  const createSantierReteteTable = `
  CREATE TABLE IF NOT EXISTS Santier_retete (
    id INT AUTO_INCREMENT PRIMARY KEY,
    limba VARCHAR(20) NOT NULL DEFAULT 'RO',
    reper_plan TEXT,
    detalii_aditionale TEXT,
    oferta_parts_id INT NOT NULL,
    cod_reteta VARCHAR(255) NOT NULL,
    clasa_reteta VARCHAR(255) NOT NULL,
    articol_client TEXT,
    articol TEXT NOT NULL,
    articol_fr TEXT,
    descriere_reteta TEXT,
    descriere_reteta_fr TEXT,
    unitate_masura VARCHAR(255) NOT NULL,
    cantitate DECIMAL(10,3) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    original_reteta_id INT,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (oferta_parts_id) REFERENCES Oferta_Parts(id),  

    INDEX idx_cod_reteta (cod_reteta),
    INDEX idx_clasa_reteta (clasa_reteta),
    INDEX idx_articol (articol(100))
  );
  `;
  await pool.execute(createSantierReteteTable);
  console.log("Santier_retete table created or already exists.");



  // Santier_retete_manopera
  //
  //
  const createSantierReteteManoperaDef = `
    CREATE TABLE IF NOT EXISTS Santier_Retete_Manopera_Definition (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      limba VARCHAR(20) NOT NULL DEFAULT 'RO',
      santier_reteta_id INT NOT NULL,
      cod_definitie VARCHAR(255) NOT NULL,   
      ocupatie TEXT NOT NULL,
      ocupatie_fr TEXT,
      descriere TEXT,
      descriere_fr TEXT,
      unitate_masura VARCHAR(20) NOT NULL DEFAULT 'h',
      cost_unitar DECIMAL(10,3) NOT NULL DEFAULT 0.000,
      cantitate DECIMAL(10,3) NOT NULL DEFAULT 0.000,
      original_manoperaDefinition_id INT,
      data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      INDEX idx_cod_definitie (cod_definitie),
      INDEX idx_ocupatie (ocupatie(100)),
      INDEX idx_limba (limba),
      FOREIGN KEY (santier_reteta_id) REFERENCES Santier_retete(id)
    );
    `;
  await pool.execute(createSantierReteteManoperaDef);
  console.log("Santier_retete_manopera_Definition table created or already exists.");

  const createSantierReteteManopera = `
    CREATE TABLE IF NOT EXISTS Santier_Retete_Manopera (
      id INT AUTO_INCREMENT PRIMARY KEY,
      definitie_id BIGINT UNSIGNED,
      cod_manopera VARCHAR(255) NOT NULL,
      descriere TEXT,
      descriere_fr TEXT,
      cost_unitar DECIMAL(10,3) NOT NULL DEFAULT 0.000,
      original_manopera_id INT,
      data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      INDEX idx_cod_manopera (cod_manopera),
      INDEX idx_descriere (descriere(100)),
      INDEX idx_descriere_fr (descriere_fr(100)),
      INDEX idx_definitie (definitie_id),

      FOREIGN KEY (definitie_id) REFERENCES Santier_Retete_Manopera_Definition(id)
    );
  `;
  await pool.execute(createSantierReteteManopera);
  console.log("Santier_retete_manopera table created or already exists.");


  // Santier_retete_materiale
  //
  //
  const createSantierReteteMaterialeDef = `
  CREATE TABLE IF NOT EXISTS Santier_Retete_Materiale_Definition (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    santier_reteta_id INT NOT NULL,
    limba VARCHAR(20) NOT NULL DEFAULT 'RO',
    photoUrl TEXT NOT NULL,
    clasa_material VARCHAR(255) NOT NULL,
    cod_definitie VARCHAR(255) NOT NULL,   
    tip_material VARCHAR(50) NOT NULL,
    denumire VARCHAR(255) NOT NULL,
    denumire_fr VARCHAR(255),
    descriere TEXT,
    descriere_fr TEXT,
    unitate_masura VARCHAR(50) NOT NULL,
    cost_unitar DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    cost_preferential DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    pret_vanzare DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    cantitate DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    original_materialDefinition_id INT,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_cod_definitie (cod_definitie),
    INDEX idx_denumire (denumire),
    INDEX idx_tip_material (tip_material),
    INDEX idx_limba (limba),
    FOREIGN KEY (santier_reteta_id) REFERENCES Santier_retete(id)
  );
  `;
  await pool.execute(createSantierReteteMaterialeDef);
  console.log("Santier_retete_materiale_definition table created or already exists.");

  const createSantierReteteMateriale = `
  CREATE TABLE IF NOT EXISTS Santier_Retete_Materiale (
    id INT AUTO_INCREMENT PRIMARY KEY,
    definitie_id BIGINT UNSIGNED,
    photoUrl TEXT NOT NULL,
    cod_material VARCHAR(255) NOT NULL,   
    descriere TEXT,
    descriere_fr TEXT,
    cost_unitar DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    cost_preferential DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    pret_vanzare DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    furnizor VARCHAR(255) NOT NULL,
    original_material_id INT,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_cod (cod_material),
    INDEX idx_furnizor (furnizor(100)),
    INDEX idx_descriere (descriere(100)),
    INDEX idx_descriere_fr (descriere_fr(100)),
    INDEX idx_definitie (definitie_id),

    FOREIGN KEY (definitie_id) REFERENCES Santier_Retete_Materiale_Definition(id)
  );
  `;
  await pool.execute(createSantierReteteMateriale);
  console.log("Santier_retete_materiale table created or already exists.");

  // Santier_retete_Utilaje
  //
  //
  const createSantierReteteUtilajeDef = `
    CREATE TABLE IF NOT EXISTS Santier_Retete_Utilaje_Definition (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      limba VARCHAR(20) NOT NULL DEFAULT 'RO',
      cod_definitie VARCHAR(255) NOT NULL,
      santier_reteta_id INT NOT NULL,
      clasa_utilaj VARCHAR(255) NOT NULL,
      utilaj TEXT NOT NULL,
      utilaj_fr TEXT,
      descriere TEXT,
      descriere_fr TEXT,
      photoUrl TEXT NOT NULL,
      unitate_masura VARCHAR(50) NOT NULL,
      cost_amortizare DECIMAL(10,3) NOT NULL DEFAULT 0.000,
      pret_utilaj DECIMAL(10,3) NOT NULL DEFAULT 0.000,
      cantitate DECIMAL(10,3) NOT NULL DEFAULT 0.000,
      original_utilajDefinition_id INT,
      data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (santier_reteta_id) REFERENCES Santier_retete(id),
      INDEX idx_utilaj (utilaj(100)),
      INDEX idx_utilaj_fr (utilaj_fr(100)),
      INDEX idx_cod_definitie (cod_definitie),
      INDEX idx_limba (limba),
      INDEX idx_descriere_utilaj (descriere(100))
    );
    `;
  await pool.execute(createSantierReteteUtilajeDef);
  console.log("Santier_retete_utilaje_definition table created or already exists.");

  const createSantierReteteUtilaje = `
  CREATE TABLE IF NOT EXISTS Santier_Retete_Utilaje (
    id INT AUTO_INCREMENT PRIMARY KEY,
    definitie_id BIGINT UNSIGNED,
    cod_utilaj VARCHAR(255) NOT NULL,
    furnizor VARCHAR(255) NOT NULL,
    descriere TEXT,
    descriere_fr TEXT,
    photoUrl TEXT NOT NULL,
    status_utilaj VARCHAR(255) NOT NULL,
    cost_amortizare DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    pret_utilaj DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    original_utilaj_id INT,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (definitie_id) REFERENCES Santier_Retete_Utilaje_Definition(id),
    INDEX idx_cod_utilaj (cod_utilaj),
    INDEX idx_furnizor (furnizor(100)),
    INDEX idx_descriere_utilaj (descriere(100))
  );
  `;
  await pool.execute(createSantierReteteUtilaje);
  console.log("Santier_retete_utilaje table created or already exists.");



  // Santier_retete_transport
  //
  //
  const createSantierReteteTransportDef = `
  CREATE TABLE IF NOT EXISTS Santier_Retete_Transport_Definition (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    limba VARCHAR(20) NOT NULL DEFAULT 'RO',
    santier_reteta_id INT NOT NULL,
    cod_definitie VARCHAR(255) NOT NULL,
    clasa_transport VARCHAR(255) NOT NULL,
    transport TEXT NOT NULL,
    transport_fr TEXT,
    descriere TEXT,
    descriere_fr TEXT,
    unitate_masura VARCHAR(20) NOT NULL,
    cost_unitar DECIMAL(10,3) NOT NULL,
    original_transportDefinition_id INT,
    cantitate DECIMAL(10,3) NOT NULL,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_cod_transport (cod_definitie),
    INDEX idx_clasa_transport (clasa_transport),
    INDEX idx_limba (limba),
    INDEX idx_transport (transport(100)),
    INDEX idx_transport_fr (transport_fr(100)),
    FOREIGN KEY (santier_reteta_id) REFERENCES Santier_retete(id)
  );
  `;
  await pool.execute(createSantierReteteTransportDef);
  console.log("Santier_retete_transport_definition table created or already exists.");

  const createSantierReteteTransport = `
  CREATE TABLE IF NOT EXISTS Santier_Retete_Transport (
    id INT AUTO_INCREMENT PRIMARY KEY,
    definitie_id BIGINT UNSIGNED,
    cod_transport VARCHAR(255) NOT NULL,
    descriere TEXT,
    descriere_fr TEXT,
    cost_unitar DECIMAL(10,3) NOT NULL,
    original_transport_id INT,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_cod_transport (cod_transport),
    INDEX idx_descriere (descriere(100)),
    INDEX idx_descriere_fr (descriere_fr(100)),
    FOREIGN KEY (definitie_id) REFERENCES Santier_Retete_Transport_Definition(id)
  );
  `;
  await pool.execute(createSantierReteteTransport);
  console.log("Santier_retete_transport table created or already exists.");
  //
  //
  //
  //
  //

  const sesiuniDeLucru = `
      CREATE TABLE IF NOT EXISTS sesiuni_de_lucru (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        santier_id INT NOT NULL,

        start_time DATETIME NOT NULL,
        end_time DATETIME DEFAULT NULL,

        start_lat FLOAT DEFAULT NULL,
        start_lng FLOAT DEFAULT NULL,

        end_lat FLOAT DEFAULT NULL,
        end_lng FLOAT DEFAULT NULL,

        session_date DATE GENERATED ALWAYS AS (DATE(start_time)) STORED,

        rating TINYINT UNSIGNED NOT NULL DEFAULT 5,
        status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
        note TEXT,

        edited TINYINT(1) NOT NULL DEFAULT 0,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (santier_id) REFERENCES santiere(id),

        INDEX idx_user_date (user_id),
        INDEX idx_santier_date (santier_id),
        INDEX idx_session_date (session_date)

      );
    `;
  await pool.execute(sesiuniDeLucru);
  console.log("sesiuni_de_lucru table created or already exists.");

  const sesiuniLocatii = `
    CREATE TABLE IF NOT EXISTS sesiuni_locatii (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sesiune_id INT NOT NULL,
        lat FLOAT NOT NULL,
        lng FLOAT NOT NULL,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (sesiune_id) REFERENCES sesiuni_de_lucru(id)
    );
  `;
  await pool.execute(sesiuniLocatii);
  console.log("sesiuni_locatii table created or already exists.");

  const atribuireActivitate = `
      CREATE TABLE IF NOT EXISTS atribuire_activitate (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        santier_id INT NOT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (santier_id) REFERENCES Santiere(id),

        UNIQUE KEY unique_user_santier (user_id, santier_id)
      );
    `;
  await pool.execute(atribuireActivitate);
  console.log("atribuire_activitate table created or already exists.");

  const rezerveLucrari = `
  CREATE TABLE IF NOT EXISTS Rezerve_Lucrari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    santier_id INT NOT NULL,

    name VARCHAR(255) NOT NULL,
    description TEXT NULL,

    is_3d TINYINT(1) NOT NULL DEFAULT 0,           
    asset_path VARCHAR(1024) NULL,      

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_rezerve_lucrari_santier
      FOREIGN KEY (santier_id)
      REFERENCES Santiere(id)         -- change to \`santiere\` if your real table is lowercase
      ON DELETE CASCADE
      ON UPDATE CASCADE,

    UNIQUE KEY uq_lucrare_per_santier (santier_id, name),
    INDEX idx_santier (santier_id),
    INDEX idx_is_3d (is_3d)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;
  await pool.execute(rezerveLucrari);
  console.log("rezerve_lucrari table created or already exists.");

  const rezervePlans = `
    CREATE TABLE IF NOT EXISTS Rezerve_Plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      lucrare_id INT NOT NULL,

      title VARCHAR(255) NOT NULL,               -- e.g. "Plan Parter"
      scale_label VARCHAR(32) NOT NULL,          -- "1:50"
      dpi INT NOT NULL,                          -- rasterization DPI
      width_px INT NOT NULL,
      height_px INT NOT NULL,

      meters_per_px DECIMAL(16,8) NULL,          -- computed at upload

      -- file locations
      pdf_path VARCHAR(512) NOT NULL,            -- /uploads/Plans/<lid>/plan.pdf
      image_path VARCHAR(512) NOT NULL,          -- /uploads/Plans/<lid>/plan.png
      image_mid_path VARCHAR(512) NOT NULL,     -- /uploads/Plans/<lid>/plan_mid.png
      image_low_path VARCHAR(512) NOT NULL,     -- /uploads/Plans/<lid>/plan_low.png
      thumb_path VARCHAR(512) NULL,              -- /uploads/Plans/<lid>/plan_thumb.jpg

      tiles_base_url VARCHAR(512) NULL,
      tiles_max_zoom INT NULL,
      tile_size INT NULL,
      tiles_layout ENUM('dzi','zoomify') NULL,
      tiles_version INT NOT NULL DEFAULT 1,

      -- 🧩 Pattern system (each plan can reuse a pattern)
      pattern_id CHAR(36) NULL,                  -- FK to Patterns table
      pattern_offset_x FLOAT DEFAULT 0,          -- translate (fraction of width)
      pattern_offset_y FLOAT DEFAULT 0,          -- translate (fraction of height)
      pattern_scale_x  FLOAT DEFAULT 1,          -- scale multiplier
      pattern_scale_y  FLOAT DEFAULT 1,
      pattern_rotation  FLOAT DEFAULT 0,          -- degrees (optional)

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      CONSTRAINT fk_rezerve_plans_lucrare
        FOREIGN KEY (lucrare_id)
        REFERENCES Rezerve_Lucrari(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

      CONSTRAINT fk_rezerve_plans_pattern
        FOREIGN KEY (pattern_id)
        REFERENCES Rezerve_Patterns(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

      INDEX idx_lucrare (lucrare_id),
      INDEX idx_pattern (pattern_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

  await pool.execute(rezervePlans);
  console.log("Rezerve_Plans table created or already exists with pattern support.");

  const rezerve_patterns = `
        CREATE TABLE IF NOT EXISTS S09_Rezerve_Patterns (
        id   INT PRIMARY KEY AUTO_INCREMENT,
        santier_id   INT NOT NULL,
        name         VARCHAR(255) NOT NULL,
        description  TEXT,
        created_by   INT,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (santier_id) REFERENCES Santiere(id) ON DELETE CASCADE
      );
    `;
  await pool.execute(rezerve_patterns);
  console.log("Rezerve_Patterns table created or already exists.");

  const rezerve_pattern_zones = `
    CREATE TABLE IF NOT EXISTS S09_Rezerve_Pattern_Zones (
      id        INT PRIMARY KEY AUTO_INCREMENT,
      pattern_id    INT NOT NULL,
      title         VARCHAR(255),
      color_hex     VARCHAR(16),
      opacity       FLOAT DEFAULT 0.3,
      stroke_width  FLOAT DEFAULT 5,
      label_x_pct   FLOAT,
      label_y_pct   FLOAT,
      label_w_pct   FLOAT,
      points_json   JSON,     -- [x1_pct, y1_pct, x2_pct, y2_pct, ...]
      FOREIGN KEY (pattern_id) REFERENCES S09_Rezerve_Patterns(id) ON DELETE CASCADE
    );
  `;
  await pool.execute(rezerve_pattern_zones);
  console.log("Rezerve_Pattern_Zones table created or already exists.");


  const rezervePins = `
    CREATE TABLE IF NOT EXISTS Rezerve_Pins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      plan_id INT NOT NULL,
      user_id INT NULL,                 -- creator of the pin
      assigned_user_id INT NULL,        -- the user assigned to resolve it (nullable)

      -- normalized position on the plan image (0..1)
      x_pct DECIMAL(6,5) NOT NULL,
      y_pct DECIMAL(6,5) NOT NULL,

      code VARCHAR(32) NULL,          
      title VARCHAR(255) NULL,
      description TEXT NULL,
      reper VARCHAR(255) NULL,

      status ENUM('new','in_progress','blocked','done','cancelled','checked') DEFAULT 'new',
      priority ENUM('low','medium','high','critical') DEFAULT 'medium',

      due_date DATETIME NULL DEFAULT NULL,           -- deadline (UTC)

      photo1_path VARCHAR(255) NULL,    -- relative path or URL
      photo2_path VARCHAR(255) NULL,
      photo3_path VARCHAR(255) NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      CONSTRAINT fk_rezerve_pins_plan FOREIGN KEY (plan_id)
        REFERENCES Rezerve_Plans(id) ON DELETE CASCADE,

      CONSTRAINT fk_rezerve_pins_creator FOREIGN KEY (user_id)
        REFERENCES Users(id) ON DELETE SET NULL,

      CONSTRAINT fk_rezerve_pins_assigned FOREIGN KEY (assigned_user_id)
        REFERENCES Users(id) ON DELETE SET NULL,

      UNIQUE KEY uq_pin_code_per_plan (plan_id, code),
      INDEX idx_plan (plan_id),
      INDEX idx_user (user_id),
      INDEX idx_assigned_user (assigned_user_id),
      INDEX idx_status (status),
      INDEX idx_priority (priority),
      INDEX idx_due_date (due_date)
    );
  `;
  await pool.execute(rezervePins);
  console.log("Rezerve_Pins table created or already exists.");

  const comments_photo = `
    CREATE TABLE IF NOT EXISTS Rezerve_PinComments (
      id           INT PRIMARY KEY AUTO_INCREMENT,
      pin_id       INT NOT NULL,
      user_id      INT NOT NULL,
      body_text    TEXT NULL,                     

      -- Optional status change captured on the comment:
      status_from ENUM('new','in_progress','blocked','done','cancelled','checked') NULL,
      status_to   ENUM('new','in_progress','blocked','done','cancelled','checked') NULL,

      photo1_path VARCHAR(255) NULL,    -- relative path or URL
      photo2_path VARCHAR(255) NULL,
      photo3_path VARCHAR(255) NULL,

      created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_pin_created (pin_id, created_at DESC),

      CONSTRAINT fk_comment_pin  FOREIGN KEY (pin_id)  REFERENCES Rezerve_Pins(id),
      CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `;
  await pool.execute(comments_photo);
  console.log("Rezerve_PinComments table created or already exists.");

  const rezervePinsSeen = `
        CREATE TABLE IF NOT EXISTS Rezerve_PinSeen (
          user_id INT NOT NULL,
          pin_id  INT NOT NULL,
          last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, pin_id),
          KEY idx_pin (pin_id),
          CONSTRAINT fk_seen_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_seen_pin  FOREIGN KEY (pin_id)  REFERENCES Rezerve_Pins(id) ON DELETE CASCADE
        );
  `;
  await pool.execute(rezervePinsSeen);
  console.log("Rezerve_PinSeen table created or already exists.");

  //Sarcini
  //
  //
  //
  //
  //
  //
  //
  //
  //
  const sarcini = `
    CREATE TABLE IF NOT EXISTS S07_Sarcini (
      id INT AUTO_INCREMENT PRIMARY KEY,
      santier_id INT NOT NULL,

      title VARCHAR(255) NOT NULL,
      detalii TEXT,
      reper VARCHAR(255),
      priority ENUM('low','normal','high','critical') NOT NULL DEFAULT 'normal',
      status ENUM('new','in_progress','blocked','done','cancelled','checked') DEFAULT 'new',
      due_date DATETIME,

      estimated_minutes INT NOT NULL DEFAULT 0,

      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

      photo1_path TEXT,
      photo2_path TEXT,
      photo3_path TEXT,

      INDEX idx_santier (santier_id),
      INDEX idx_due (due_date),
      INDEX idx_status (status),
      INDEX idx_priority (priority),
      INDEX idx_creator (created_by)
    );
  `;
  await pool.execute(sarcini);
  console.log("07_Sarcini table created or already exists.");

  const sarciniReteta = `
  CREATE TABLE IF NOT EXISTS S07_Sarcina_Reteta(
    id INT AUTO_INCREMENT PRIMARY KEY,

    sarcina_id INT NOT NULL,             -- legătura directă cu sarcina
    santier_reteta_id INT NOT NULL,         -- rețeta „sursă” din ofertă (Santier_retete)
    oferta_parts_id INT NOT NULL,           -- pentru rapoarte pe lucrare
    original_reteta_id INT,                 -- audit/trasabilitate

    -- date „înghețate” din rețeta sursă (nu mai depind de ofertă)
    cod_reteta VARCHAR(255),
    clasa_reteta VARCHAR(255),
    limba VARCHAR(20) NOT NULL DEFAULT 'RO',
    reper_plan TEXT,
    detalii_aditionale TEXT,
    articol_client TEXT,
    articol TEXT,
    articol_fr TEXT,
    descriere TEXT,
    descriere_fr TEXT,
    unitate_masura VARCHAR(50) NOT NULL,

    -- cantități
    cantitate_oferta DECIMAL(10,3) NOT NULL,   -- cât era în ofertă pentru rețeta asta (ex: 20.000)
    cantitate_alocata DECIMAL(10,3) NOT NULL,  -- cât trimiți în sarcina curentă (ex: 10.000 din 20.000)
    cantitate_executata DECIMAL(10,3) NOT NULL DEFAULT 0.000, -- progres cumulativ bifat de angajați

    -- detalii adiționale la nivel de sarcină (ce ți-ai dorit)
    detalii_reteta TEXT,

    -- opțional (dacă vrei să păstrezi o sumă de costuri calculată în momentul alocării)
    total_cost DECIMAL(12,3) NOT NULL DEFAULT 0.000,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sarcina_id) REFERENCES S07_Sarcini(id),
    INDEX idx_sarcina (sarcina_id),
    INDEX idx_santier_reteta (santier_reteta_id),
    INDEX idx_oferta_parts (oferta_parts_id)
  );
  `;
  await pool.execute(sarciniReteta);
  console.log("07_Sarcina_Reteta table created or already exists.");


  await insertInitialAdminUser(pool);
  console.log("All tables checked/created successfully.");
}

async function insertInitialAdminUser(pool) {
  try {
    const email = "admin@btbtrust.com";
    const name = "admin";
    const plainPassword = "admin";
    const role = "ofertant";

    const [existingAdmins] = await pool.execute(
      "SELECT * FROM users WHERE role = ?",
      [role]
    );

    if (existingAdmins.length > 0) {
      console.log("Admin user already exists.");
      return;
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const insertQuery = `
      INSERT INTO users (email, name, password, role, photo_url)
      VALUES (?, ?, ?, ?, ?)
    `;
    await pool.execute(insertQuery, [
      email,
      name,
      hashedPassword,
      role,
      "uploads/Angajati/no-user-image-square.jpg",
    ]);

    console.log("Admin user inserted successfully.");
  } catch (err) {
    console.error("Error inserting admin user:", err);
  }
}

module.exports = initializeDB;
