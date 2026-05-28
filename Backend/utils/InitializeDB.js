const bcrypt = require("bcryptjs");

async function initializeDB(pool) {
  const creatCompaniesTable = `
        CREATE TABLE IF NOT EXISTS S10_Companii (
        id                        INT AUTO_INCREMENT PRIMARY KEY,

        logo_url                  VARCHAR(255) NULL,
        nume_companie             VARCHAR(255) NOT NULL,
        grup_companie             VARCHAR(255) NULL,
        domeniu_unitate_afaceri   VARCHAR(150) NULL,
        forma_juridica            VARCHAR(80)  NULL,

        tara                      CHAR(2) NOT NULL DEFAULT 'FR',
        regiune                   VARCHAR(120) NULL,
        oras                      VARCHAR(120) NULL,
        adresa                    VARCHAR(255) NULL,
        cod_postal                VARCHAR(16)  NULL,
        website                   VARCHAR(255) NULL,

        email                     VARCHAR(255) NULL,
        telefon                   VARCHAR(50)  NULL,

        nivel_strategic           VARCHAR(20) NOT NULL DEFAULT 'Tinta',
        status_relatie            VARCHAR(20) NOT NULL DEFAULT 'Prospect',
        nivel_risc                VARCHAR(20) NOT NULL DEFAULT 'Mediu',

        nda_semnat                BOOLEAN NOT NULL DEFAULT FALSE,
        scor_conformitate         INT NOT NULL DEFAULT 0,
        utilizator_responsabil_id INT NULL,

        note                      TEXT NULL,

        created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id        INT NULL,
        updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by_user_id        INT NULL,

        CHECK (scor_conformitate BETWEEN 0 AND 100),

        -- Indexuri
        INDEX idx_companii_nume (nume_companie),
        INDEX idx_companii_grup (grup_companie),
        INDEX idx_companii_responsabil (utilizator_responsabil_id),

        -- Unicitate (nume + tara + oras)
        UNIQUE KEY uq_companii_nume_tara_oras (nume_companie, tara, oras)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
  await pool.execute(creatCompaniesTable);
  console.log("Table S10_Companii created or already exists.");

  // --- 2. FILIALE (NEW TABLE) ---
  const createFilialeTable = `
        CREATE TABLE IF NOT EXISTS S10_Filiale (
        id                      INT AUTO_INCREMENT PRIMARY KEY,
        
        -- Hierarchy
        companie_id             INT NOT NULL,
        
        -- Details
        nume_filiala            VARCHAR(255) NOT NULL,
        tip_unitate             VARCHAR(50) NOT NULL DEFAULT 'Filiale', -- Filiale / Directie
        
        tara                    VARCHAR(100) NOT NULL DEFAULT 'Romania',
        regiune                 VARCHAR(100) NULL,
        oras                    VARCHAR(100) NULL,
        
        longitudine             DECIMAL(10, 7) NULL,
        latitudine             DECIMAL(10, 7) NULL,

        nivel_decizie           VARCHAR(50) NOT NULL DEFAULT 'Regional', -- Local / Regional / National
        
        telefon                 VARCHAR(50) NULL,
        email                   VARCHAR(255) NULL,
        note                    TEXT NULL,

        -- Audit
        created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id      INT NULL,
        updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by_user_id      INT NULL,

        -- Constraints
        CONSTRAINT fk_filiale_companie FOREIGN KEY (companie_id) REFERENCES S10_Companii(id) ON DELETE RESTRICT,

        -- Indexes
        INDEX idx_filiale_companie (companie_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
  await pool.execute(createFilialeTable);
  console.log("Table S10_Filiale created or already exists.");

  const createSantiereTableQuery = `
        CREATE TABLE IF NOT EXISTS S01_Santiere (
        id INT AUTO_INCREMENT PRIMARY KEY,
        
        -- Identification
        nume VARCHAR(100) NOT NULL,
        culoare_hex CHAR(7) NOT NULL DEFAULT '#FFFFFF',
        
        -- Hierarchy
        companie_id INT NOT NULL,
        filiala_id INT NULL,

        -- Status & Dates
        activ TINYINT(1) NOT NULL DEFAULT 1, -- cleaner than tinyint
        notita TEXT NULL,
        data_inceput DATE NULL,
        data_sfarsit DATE NULL,

        -- Location (Optimized for Maps)
        adresa VARCHAR(255) NULL,
        longitudine DECIMAL(10, 7) NULL, -- Standard GPS precision
        latitudine DECIMAL(10, 7)  NULL, -- Standard GPS precision

        -- Audit
        created_by_user_id INT NULL,
        updated_by_user_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        -- Constraints
        CONSTRAINT fk_santiere_companie FOREIGN KEY (companie_id) REFERENCES S10_Companii(id) ON DELETE RESTRICT,
        CONSTRAINT fk_santiere_filiala FOREIGN KEY (filiala_id) REFERENCES S10_Filiale(id) ON DELETE SET NULL,

        -- Indexes for performance
        INDEX idx_santiere_companie (companie_id)
        -- INDEX idx_santiere_filiala (filiala_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

  await pool.execute(createSantiereTableQuery);
  console.log("S01_Santiere table created or already exists.");

  const createCompaniesTable = `
    CREATE TABLE IF NOT EXISTS S00_Companii_Interne (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nume VARCHAR(100) NOT NULL,
      culoare_hex VARCHAR(20) DEFAULT '#3b82f6', -- Cod Hex pentru UI (ex: Tailwind Blue 500)
      logo_url VARCHAR(255),
      created_by_user_id INT,
      updated_by_user_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP  
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await pool.execute(createCompaniesTable);
  console.log("S00_Companii_Interne table created or already exists.");

  const permisuniui = `
    CREATE TABLE IF NOT EXISTS S00_Permisiuni_Predefinite (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nume_rol VARCHAR(50) NOT NULL UNIQUE,
      descriere VARCHAR(255),
      json_permisiuni JSON NOT NULL, -- Stochează structura de bife
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await pool.execute(permisuniui);
  console.log("S00_Permisiuni_Predefinite table created or already exists.");

  const createUsersTable = `
  CREATE TABLE IF NOT EXISTS S00_Utilizatori (
      id INT AUTO_INCREMENT PRIMARY KEY,
      companie_interna_id INT DEFAULT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(50) NOT NULL,
      
      -- Specializare devine câmp text/user
      specializare VARCHAR(100) DEFAULT NULL, 
      
      telephone VARCHAR(20),
      telephone_1 VARCHAR(20),
      telefon_prefix VARCHAR(10),
      telefon_prefix_1 VARCHAR(10),
      data_nastere DATE,
         
      -- Permisiunile granulare (copiate din template sau personalizate)
      permissions JSON DEFAULT NULL, 
      permissions_template_id INT DEFAULT NULL, -- referință la S00_Permisiuni_Predefinite pentru template
      
      photo_url VARCHAR(255) DEFAULT 'default_user.png',
      activ TINYINT NOT NULL DEFAULT 1,
      created_by_user_id INT,
      updated_by_user_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_users_companie (companie_interna_id),
      INDEX idx_users_permissions_template (permissions_template_id),

      CONSTRAINT fk_users_companie_interna
      FOREIGN KEY (companie_interna_id) REFERENCES S00_Companii_Interne(id)
      ON DELETE SET NULL ON UPDATE CASCADE,

      CONSTRAINT fk_users_permissions_template
      FOREIGN KEY (permissions_template_id) REFERENCES S00_Permisiuni_Predefinite(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;
  await pool.execute(createUsersTable);
  console.log("meta_options + S00_Utilizatori created (fresh).");

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

  //
  //
  //
  //
  // -------------------------- CATALOG MANOPERA/MATERIALE/TRANSPORT/UTILAJE ---------------------------------------

  const catalogTable = `
    CREATE TABLE IF NOT EXISTS S02_Catalog_Definitii (
        id INT AUTO_INCREMENT PRIMARY KEY,
        limba VARCHAR(20) NOT NULL DEFAULT 'RO',
        tip_resursa ENUM('manopera', 'material', 'utilaj', 'transport') NOT NULL,
        cod_definitie VARCHAR(100) NOT NULL,
        denumire VARCHAR(255) NOT NULL,
        denumire_fr VARCHAR(255),
        descriere TEXT,
        descriere_fr TEXT,
        photo_url VARCHAR(255),
        unitate_masura VARCHAR(50) NOT NULL,
        cost DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by_user_id INT,

        INDEX idx_tip_resursa (tip_resursa),
        INDEX idx_cod_definitie (cod_definitie)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
  await pool.execute(catalogTable);
  console.log("Catalog_Definitii table created or already exists.");

  const catalogSubcategoriiTable = `
    CREATE TABLE IF NOT EXISTS S02_Catalog_Subcategorii (
        id INT AUTO_INCREMENT PRIMARY KEY,
        definitie_id INT NOT NULL,
        cod_specific VARCHAR(255) NOT NULL,
        descriere TEXT,
        descriere_fr TEXT,
        photo_url VARCHAR(255),
        
        cost DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
        detalii_extra JSON, 
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by_user_id INT,

        FOREIGN KEY (definitie_id) REFERENCES S02_Catalog_Definitii(id) ON DELETE CASCADE,
        INDEX idx_cod_specific (cod_specific)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
  await pool.execute(catalogSubcategoriiTable);
  console.log("S02_Catalog_Subcategorii table created or already exists.");

  ///
  //
  //
  // -------------------------- RETETE ------------------------------------

  const reteteTable = `
    CREATE TABLE IF NOT EXISTS S02_Retete (
        id INT AUTO_INCREMENT PRIMARY KEY,
        limba VARCHAR(20) NOT NULL DEFAULT 'RO',
        cod_reteta VARCHAR(255) NOT NULL,
        clasa_reteta VARCHAR(255) NOT NULL,
        denumire VARCHAR(255) NOT NULL,
        denumire_fr VARCHAR(255),
        descriere TEXT,
        descriere_fr TEXT,
        unitate_masura VARCHAR(50) NOT NULL,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by_user_id INT,
        
        INDEX idx_cod_reteta (cod_reteta),
        INDEX idx_clasa_reteta (clasa_reteta)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
  await pool.execute(reteteTable);
  console.log("Retete table created or already exists.");

  const reteteElementeTable = `
      CREATE TABLE IF NOT EXISTS S02_Retete_Elemente (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reteta_id INT NOT NULL,
        definitie_id INT NOT NULL,
        cantitate DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by_user_id INT,
        
        UNIQUE (reteta_id, definitie_id),
        FOREIGN KEY (reteta_id) REFERENCES S02_Retete(id) ON DELETE CASCADE,
        FOREIGN KEY (definitie_id) REFERENCES S02_Catalog_Definitii(id) ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
  await pool.execute(reteteElementeTable);
  console.log("Retete_Elemente table created or already exists.");

  ///
  //
  //
  // -------------------------- OFERTARE ------------------------------------

  const oferteTable = `
  CREATE TABLE IF NOT EXISTS S03_Oferte (
    id INT AUTO_INCREMENT PRIMARY KEY,
    santier_id INT NOT NULL,

    nume VARCHAR(255) NOT NULL,
    descriere TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by_user_id INT NULL,

    CONSTRAINT fk_oferte_santier
      FOREIGN KEY (santier_id)
      REFERENCES S01_Santiere(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE,

    INDEX idx_oferte_santier (santier_id),
    INDEX idx_oferte_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

  await pool.execute(oferteTable);
  console.log("S03_Oferte table created or already exists.");

  const oferteLucrariTable = `
  CREATE TABLE IF NOT EXISTS S03_Oferte_Lucrari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    oferta_id INT NOT NULL,

    nume VARCHAR(255) NOT NULL,
    descriere TEXT,
    coloane_config JSON NULL,


    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by_user_id INT NULL,

    CONSTRAINT fk_oferte_lucrari_oferta
      FOREIGN KEY (oferta_id)
      REFERENCES S03_Oferte(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE,

    INDEX idx_oferte_lucrari_oferta (oferta_id),
    INDEX idx_oferte_lucrari_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

  await pool.execute(oferteLucrariTable);
  console.log("S03_Oferte_Lucrari table created or already exists.");

  const oferteReteteTable = `
  CREATE TABLE IF NOT EXISTS S03_Oferte_Retete (
    id INT AUTO_INCREMENT PRIMARY KEY,

    lucrare_id INT NOT NULL,

    -- legătură către rețeta originală, doar pentru istoric/debug
    original_reteta_id INT NULL,

    limba VARCHAR(20) NOT NULL DEFAULT 'RO',

    cod_reteta VARCHAR(255) NOT NULL,
    clasa_reteta VARCHAR(255) NOT NULL,

    denumire VARCHAR(255) NOT NULL,
    denumire_fr VARCHAR(255) NULL,

    descriere TEXT NULL,
    descriere_fr TEXT NULL,

    unitate_masura VARCHAR(50) NOT NULL,

    -- cantitatea rețetei în lucrarea ofertei
    cantitate_lucrare DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
    cantitate_lucrare_formula VARCHAR(511) NULL,

    -- valorile pentru coloanele dinamice ale lucrării
    coloane_valori JSON NULL,

    sort_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by_user_id INT NULL,

    CONSTRAINT fk_oferte_retete_lucrare
      FOREIGN KEY (lucrare_id)
      REFERENCES S03_Oferte_Lucrari(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE,

    CONSTRAINT fk_oferte_retete_original
      FOREIGN KEY (original_reteta_id)
      REFERENCES S02_Retete(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE,

    INDEX idx_oferte_retete_lucrare (lucrare_id),
    INDEX idx_oferte_retete_original (original_reteta_id),
    INDEX idx_oferte_retete_sort (lucrare_id, sort_order),
    INDEX idx_oferte_retete_cod (cod_reteta),
    INDEX idx_oferte_retete_clasa (clasa_reteta),
    INDEX idx_oferte_retete_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

  await pool.execute(oferteReteteTable);
  console.log("S03_Oferte_Retete table created or already exists.");

  const oferteCatalogDefinitiiTable = `
  CREATE TABLE IF NOT EXISTS S03_Oferte_Catalog_Definitii (
    id INT AUTO_INCREMENT PRIMARY KEY,

    oferta_reteta_id INT NOT NULL,

    -- legătură către catalogul original
    original_definitie_id INT NULL,

    limba VARCHAR(20) NOT NULL DEFAULT 'RO',
    tip_resursa ENUM('manopera', 'material', 'utilaj', 'transport') NOT NULL,

    cod_definitie VARCHAR(100) NOT NULL,
    denumire VARCHAR(255) NOT NULL,
    denumire_fr VARCHAR(255) NULL,

    descriere TEXT NULL,
    descriere_fr TEXT NULL,
    photo_url VARCHAR(255) NULL,

    unitate_masura VARCHAR(50) NOT NULL,
    cost DECIMAL(10, 3) NOT NULL DEFAULT 0.000,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by_user_id INT NULL,

    CONSTRAINT fk_oferte_catalog_def_oferta_reteta
      FOREIGN KEY (oferta_reteta_id)
      REFERENCES S03_Oferte_Retete(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE,

    CONSTRAINT fk_oferte_catalog_def_original
      FOREIGN KEY (original_definitie_id)
      REFERENCES S02_Catalog_Definitii(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE,

    INDEX idx_oferte_catalog_def_oferta_reteta (oferta_reteta_id),
    INDEX idx_oferte_catalog_def_original (original_definitie_id),
    INDEX idx_oferte_catalog_def_tip (tip_resursa),
    INDEX idx_oferte_catalog_def_cod (cod_definitie)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

  await pool.execute(oferteCatalogDefinitiiTable);
  console.log("S03_Oferte_Catalog_Definitii table created or already exists.");

  const oferteCatalogSubcategoriiTable = `
  CREATE TABLE IF NOT EXISTS S03_Oferte_Catalog_Subcategorii (
    id INT AUTO_INCREMENT PRIMARY KEY,

    oferta_definitie_id INT NOT NULL,

    -- legătură către varianta originală
    original_subcategorie_id INT NULL,

    cod_specific VARCHAR(255) NOT NULL,
    descriere TEXT NULL,
    descriere_fr TEXT NULL,
    photo_url VARCHAR(255) NULL,

    cost DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
    detalii_extra JSON NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by_user_id INT NULL,

    CONSTRAINT fk_oferte_catalog_sub_definitie
      FOREIGN KEY (oferta_definitie_id)
      REFERENCES S03_Oferte_Catalog_Definitii(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE,

    CONSTRAINT fk_oferte_catalog_sub_original
      FOREIGN KEY (original_subcategorie_id)
      REFERENCES S02_Catalog_Subcategorii(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE,

    UNIQUE KEY uq_oferte_catalog_sub_def_original (oferta_definitie_id, original_subcategorie_id),

    INDEX idx_oferte_catalog_sub_definitie (oferta_definitie_id),
    INDEX idx_oferte_catalog_sub_original (original_subcategorie_id),
    INDEX idx_oferte_catalog_sub_cod (cod_specific)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

  await pool.execute(oferteCatalogSubcategoriiTable);
  console.log("S03_Oferte_Catalog_Subcategorii table created or already exists.");

  const oferteReteteElementeTable = `
  CREATE TABLE IF NOT EXISTS S03_Oferte_Retete_Elemente (
    id INT AUTO_INCREMENT PRIMARY KEY,

    oferta_reteta_id INT NOT NULL,

    -- legătură către elementul original din rețeta globală
    original_reteta_element_id INT NULL,

    -- legături către catalogul COPIAT al ofertei
    oferta_definitie_id INT NOT NULL,
    oferta_subcategorie_id INT NULL,

    -- util pentru trace/debug rapid
    original_definitie_id INT NULL,
    original_subcategorie_id INT NULL,

    cantitate_in_reteta DECIMAL(10, 3) NOT NULL DEFAULT 0.000,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by_user_id INT NULL,

    CONSTRAINT fk_oferte_retete_elemente_reteta
      FOREIGN KEY (oferta_reteta_id)
      REFERENCES S03_Oferte_Retete(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE,

    CONSTRAINT fk_oferte_retete_elemente_oferta_def
      FOREIGN KEY (oferta_definitie_id)
      REFERENCES S03_Oferte_Catalog_Definitii(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE,

    CONSTRAINT fk_oferte_retete_elemente_oferta_sub
      FOREIGN KEY (oferta_subcategorie_id)
      REFERENCES S03_Oferte_Catalog_Subcategorii(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE,

    CONSTRAINT fk_oferte_retete_elemente_original_re
      FOREIGN KEY (original_reteta_element_id)
      REFERENCES S02_Retete_Elemente(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE,

    CONSTRAINT fk_oferte_retete_elemente_original_def
      FOREIGN KEY (original_definitie_id)
      REFERENCES S02_Catalog_Definitii(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE,

    CONSTRAINT fk_oferte_retete_elemente_original_sub
      FOREIGN KEY (original_subcategorie_id)
      REFERENCES S02_Catalog_Subcategorii(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE,

    INDEX idx_oferte_retete_elemente_reteta (oferta_reteta_id),
    INDEX idx_oferte_retete_elemente_oferta_def (oferta_definitie_id),
    INDEX idx_oferte_retete_elemente_oferta_sub (oferta_subcategorie_id),
    INDEX idx_oferte_retete_elemente_original_re (original_reteta_element_id),
    INDEX idx_oferte_retete_elemente_original_def (original_definitie_id),
    INDEX idx_oferte_retete_elemente_original_sub (original_subcategorie_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

  await pool.execute(oferteReteteElementeTable);
  console.log("S03_Oferte_Retete_Elemente table created or already exists.");

  const sesiuniDeLucru = `
      CREATE TABLE IF NOT EXISTS S06_Sesiuni_De_Lucru (
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
        updated_by_user_id INT,

        FOREIGN KEY (user_id) REFERENCES S00_Utilizatori(id),
        FOREIGN KEY (santier_id) REFERENCES S01_Santiere(id),

        INDEX idx_user_date (user_id),
        INDEX idx_santier_date (santier_id),
        INDEX idx_session_date (session_date)

      );
    `;
  await pool.execute(sesiuniDeLucru);
  console.log("S06_Sesiuni_De_Lucru table created or already exists.");

  const sesiuniLocatii = `
    CREATE TABLE IF NOT EXISTS S06_Sesiuni_Locatii (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sesiune_id INT NOT NULL,
        lat FLOAT NOT NULL,
        lng FLOAT NOT NULL,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (sesiune_id) REFERENCES S06_Sesiuni_De_Lucru(id)
    );
  `;
  await pool.execute(sesiuniLocatii);
  console.log("S06_Sesiuni_Locatii table created or already exists.");

  const atribuireActivitate = `
      CREATE TABLE IF NOT EXISTS S01_Atribuire_Activitate (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        santier_id INT NOT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES S00_Utilizatori(id),
        FOREIGN KEY (santier_id) REFERENCES S01_Santiere(id),

        UNIQUE KEY unique_user_santier (user_id, santier_id)
      );
    `;
  await pool.execute(atribuireActivitate);
  console.log("S01_Atribuire_Activitate table created or already exists.");

  const rezerveLucrari = `
  CREATE TABLE IF NOT EXISTS S08_Rezerve_Lucrari (
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
      REFERENCES S01_Santiere(id)         -- change to \`S01_Santiere\` if your real table is prefixed
      ON DELETE RESTRICT
      ON UPDATE CASCADE,

    UNIQUE KEY uq_lucrare_per_santier (santier_id, name),
    INDEX idx_santier (santier_id),
    INDEX idx_is_3d (is_3d)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;
  await pool.execute(rezerveLucrari);
  console.log("S08_Rezerve_Lucrari table created or already exists.");

  const rezervePlans = `
    CREATE TABLE IF NOT EXISTS S08_Rezerve_Plans (
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
        REFERENCES S08_Rezerve_Lucrari(id)
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
  console.log("S08_Rezerve_Plans table created or already exists with pattern support.");

  const rezerve_patterns = `
        CREATE TABLE IF NOT EXISTS S09_Rezerve_Patterns (
        id   INT PRIMARY KEY AUTO_INCREMENT,
        santier_id   INT NOT NULL,
        name         VARCHAR(255) NOT NULL,
        description  TEXT,
        created_by   INT,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (santier_id) REFERENCES S01_Santiere(id) ON DELETE CASCADE
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
    CREATE TABLE IF NOT EXISTS S09_Rezerve_Pins (
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
        REFERENCES S08_Rezerve_Plans(id) ON DELETE CASCADE,

      CONSTRAINT fk_rezerve_pins_creator FOREIGN KEY (user_id)
        REFERENCES S00_Utilizatori(id) ON DELETE SET NULL,

      CONSTRAINT fk_rezerve_pins_assigned FOREIGN KEY (assigned_user_id)
        REFERENCES S00_Utilizatori(id) ON DELETE SET NULL,

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
  console.log("S09_Rezerve_Pins table created or already exists.");

  const comments_photo = `
    CREATE TABLE IF NOT EXISTS S09_Rezerve_Pin_Comments (
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

      CONSTRAINT fk_comment_pin  FOREIGN KEY (pin_id)  REFERENCES S09_Rezerve_Pins(id),
      CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES S00_Utilizatori(id)
    );
  `;
  await pool.execute(comments_photo);
  console.log("S09_Rezerve_Pin_Comments table created or already exists.");

  const rezervePinsSeen = `
        CREATE TABLE IF NOT EXISTS S09_Rezerve_Pin_Seen (
          user_id INT NOT NULL,
          pin_id  INT NOT NULL,
          last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, pin_id),
          KEY idx_pin (pin_id),
          CONSTRAINT fk_seen_user FOREIGN KEY (user_id) REFERENCES S00_Utilizatori(id) ON DELETE CASCADE,
          CONSTRAINT fk_seen_pin  FOREIGN KEY (pin_id)  REFERENCES S09_Rezerve_Pins(id) ON DELETE CASCADE
        );
  `;
  await pool.execute(rezervePinsSeen);
  console.log("S09_Rezerve_Pin_Seen table created or already exists.");

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

  // await insertInitialAdminUser(pool);
  console.log("All tables checked/created successfully.");
}

async function insertInitialAdminUser(pool) {
  try {
    const email = "admin@btbtrust.com";
    const name = "admin";
    const plainPassword = "admin";

    const [existingAdmins] = await pool.execute("SELECT * FROM S00_Utilizatori WHERE role = ?", [role]);

    if (existingAdmins.length > 0) {
      console.log("Admin user already exists.");
      return;
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const insertQuery = `
      INSERT INTO S00_Utilizatori (email, name, password, photo_url)
      VALUES (?, ?, ?, ?)
    `;
    await pool.execute(insertQuery, [email, name, hashedPassword, "uploads/Angajati/no-user-image-square.jpg"]);

    console.log("Admin user inserted successfully.");
  } catch (err) {
    console.error("Error inserting admin user:", err);
  }
}

module.exports = initializeDB;
