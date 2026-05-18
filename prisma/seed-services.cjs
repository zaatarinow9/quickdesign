const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function buildOptionConfig(adminKind, extra = {}) {
  return JSON.stringify({
    adminKind,
    ...extra,
  });
}

function buildServiceConfig(config) {
  return JSON.stringify(config);
}

function createUploadField({
  key,
  label,
  helperText,
  required = false,
  allowedFileTypesText,
  accept,
  maxFiles = 1,
  maxFileSizeMb = 25,
  allowCustomerFileLabel = false,
  order,
}) {
  return {
    key,
    label,
    helperText,
    required,
    allowedFileTypesText,
    accept,
    maxFiles,
    maxFileSizeMb,
    allowCustomerFileLabel,
    order,
  };
}

function createOptionValue(name, price, order) {
  return {
    name,
    price,
    order,
    metadataJson: null,
  };
}

function createOption({
  key,
  name,
  type,
  isRequired = true,
  order,
  helperText = null,
  pricingMode = "included",
  config = {},
  values = [],
}) {
  return {
    key,
    name,
    type,
    isRequired,
    order,
    helperText,
    pricingMode,
    configJson: buildOptionConfig(type, config),
    values,
  };
}

const SERVICES = [
  {
    slug: "t-shirt-druck",
    name: "T-Shirt Druck",
    description:
      "Individuell bedruckte T-Shirts fuer Teams, Events und Unternehmen. Waehlen Sie Groesse, Farbe und Druckseite und laden Sie Ihre Motive direkt hoch.",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1600&auto=format&fit=crop",
    basePrice: 14.9,
    pricingMode: "option_based",
    order: 10,
    hasDesigner: false,
    hasColorPicker: false,
    fileLimit: 0,
    designerType: "none",
    isActive: true,
    configJson: buildServiceConfig({
      uploadFields: [
        createUploadField({
          key: "front_design",
          label: "Frontmotiv",
          helperText: "Bitte als druckfaehige Datei oder freigestelltes Motiv hochladen.",
          required: true,
          allowedFileTypesText: "pdf, ai, eps, png, jpg",
          accept: ".pdf,.ai,.eps,.png,.jpg,.jpeg",
          maxFiles: 1,
          maxFileSizeMb: 25,
          order: 1,
        }),
        createUploadField({
          key: "back_design",
          label: "Rueckenmotiv",
          helperText: "Optional, falls auch die Rueckseite bedruckt werden soll.",
          required: false,
          allowedFileTypesText: "pdf, ai, eps, png, jpg",
          accept: ".pdf,.ai,.eps,.png,.jpg,.jpeg",
          maxFiles: 1,
          maxFileSizeMb: 25,
          order: 2,
        }),
        createUploadField({
          key: "reference_images",
          label: "Referenzbilder",
          helperText: "Optional fuer Position, Stil oder Beispielprodukte.",
          required: false,
          allowedFileTypesText: "pdf, png, jpg",
          accept: ".pdf,.png,.jpg,.jpeg",
          maxFiles: 3,
          maxFileSizeMb: 15,
          allowCustomerFileLabel: true,
          order: 3,
        }),
      ],
    }),
    options: [
      createOption({
        key: "size",
        name: "Groesse",
        type: "size",
        order: 10,
        pricingMode: "included",
        values: [
          createOptionValue("S", 0, 1),
          createOptionValue("M", 0, 2),
          createOptionValue("L", 0, 3),
          createOptionValue("XL", 0, 4),
          createOptionValue("XXL", 2, 5),
        ],
      }),
      createOption({
        key: "shirt_color",
        name: "Shirtfarbe",
        type: "color",
        order: 20,
        pricingMode: "included",
        values: [
          createOptionValue("Weiss", 0, 1),
          createOptionValue("Schwarz", 0, 2),
          createOptionValue("Marineblau", 0, 3),
          createOptionValue("Grau", 0, 4),
          createOptionValue("Rot", 0, 5),
        ],
      }),
      createOption({
        key: "print_side",
        name: "Druckseite",
        type: "radio",
        order: 30,
        helperText: "Waehlen Sie, welche Seiten bedruckt werden sollen.",
        pricingMode: "additive",
        values: [
          createOptionValue("Vorderseite", 0, 1),
          createOptionValue("Rueckseite", 0, 2),
          createOptionValue("Vorder- und Rueckseite", 8, 3),
        ],
      }),
    ],
  },
  {
    slug: "visitenkarten",
    name: "Visitenkarten",
    description:
      "Professionelle Visitenkarten mit klaren Mengenstaffeln, hochwertigen Papieren und optionalen Veredelungen fuer einen starken ersten Eindruck.",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1600&auto=format&fit=crop",
    basePrice: 120,
    pricingMode: "quantity_tiers",
    order: 20,
    hasDesigner: false,
    hasColorPicker: false,
    fileLimit: 0,
    designerType: "none",
    isActive: true,
    configJson: buildServiceConfig({
      quantityTiers: [
        { label: "1000 Stueck", quantity: 1000, price: 120 },
        { label: "2000 Stueck", quantity: 2000, price: 200 },
        { label: "5000 Stueck", quantity: 5000, price: 420 },
      ],
      uploadFields: [
        createUploadField({
          key: "print_ready_pdf",
          label: "Druckfertiges PDF",
          helperText: "Bitte mit Beschnitt und eingebetteten Schriften liefern.",
          required: true,
          allowedFileTypesText: "pdf",
          accept: ".pdf",
          maxFiles: 1,
          maxFileSizeMb: 25,
          order: 1,
        }),
        createUploadField({
          key: "logo_or_source",
          label: "Logo oder Quelldatei",
          helperText: "Optional fuer Nachbearbeitung oder Reinzeichnung.",
          required: false,
          allowedFileTypesText: "pdf, ai, eps, svg, png, jpg",
          accept: ".pdf,.ai,.eps,.svg,.png,.jpg,.jpeg",
          maxFiles: 3,
          maxFileSizeMb: 25,
          allowCustomerFileLabel: true,
          order: 2,
        }),
      ],
    }),
    options: [
      createOption({
        key: "paper_type",
        name: "Papiersorte",
        type: "select",
        order: 10,
        pricingMode: "additive",
        values: [
          createOptionValue("350g Bilderdruck matt", 0, 1),
          createOptionValue("400g Premiumkarton", 20, 2),
          createOptionValue("350g Recyclingkarton", 12, 3),
        ],
      }),
      createOption({
        key: "sides",
        name: "Bedruckung",
        type: "radio",
        order: 20,
        pricingMode: "additive",
        values: [
          createOptionValue("Einseitig", 0, 1),
          createOptionValue("Beidseitig", 25, 2),
        ],
      }),
      createOption({
        key: "finishing",
        name: "Veredelung",
        type: "select",
        order: 30,
        pricingMode: "additive",
        values: [
          createOptionValue("Ohne Veredelung", 0, 1),
          createOptionValue("Mattlaminierung", 18, 2),
          createOptionValue("Softtouch-Laminierung", 28, 3),
          createOptionValue("Spot-UV", 45, 4),
        ],
      }),
      createOption({
        key: "rounded_corners",
        name: "Abgerundete Ecken",
        type: "radio",
        order: 40,
        pricingMode: "additive",
        values: [
          createOptionValue("Nein", 0, 1),
          createOptionValue("Ja", 15, 2),
        ],
      }),
    ],
  },
  {
    slug: "broschueren",
    name: "Broschueren",
    description:
      "Mehrseitige Broschueren fuer Praesentationen, Produkte und Unternehmenskommunikation mit sauber strukturierten Mengen- und Ausstattungsoptionen.",
    image:
      "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?q=80&w=1600&auto=format&fit=crop",
    basePrice: 220,
    pricingMode: "quantity_tiers",
    order: 30,
    hasDesigner: false,
    hasColorPicker: false,
    fileLimit: 0,
    designerType: "none",
    isActive: true,
    configJson: buildServiceConfig({
      quantityTiers: [
        { label: "100 Exemplare", quantity: 100, price: 220 },
        { label: "250 Exemplare", quantity: 250, price: 420 },
        { label: "500 Exemplare", quantity: 500, price: 760 },
      ],
      uploadFields: [
        createUploadField({
          key: "print_ready_pdf",
          label: "Druckfertiges PDF",
          helperText: "Bitte als zusammenhaengende Broschueren-Datei anlegen.",
          required: true,
          allowedFileTypesText: "pdf",
          accept: ".pdf",
          maxFiles: 1,
          maxFileSizeMb: 50,
          order: 1,
        }),
        createUploadField({
          key: "images_assets",
          label: "Bilder und Assets",
          helperText: "Optional fuer Satz, Reinzeichnung oder Bildaustausch.",
          required: false,
          allowedFileTypesText: "pdf, png, jpg, zip",
          accept: ".pdf,.png,.jpg,.jpeg,.zip",
          maxFiles: 10,
          maxFileSizeMb: 50,
          allowCustomerFileLabel: true,
          order: 2,
        }),
      ],
    }),
    options: [
      createOption({
        key: "format",
        name: "Format",
        type: "select",
        order: 10,
        pricingMode: "additive",
        values: [
          createOptionValue("A5 Hochformat", 0, 1),
          createOptionValue("A4 Hochformat", 180, 2),
          createOptionValue("Quadrat 210 x 210 mm", 120, 3),
        ],
      }),
      createOption({
        key: "page_count",
        name: "Seitenumfang",
        type: "select",
        order: 20,
        pricingMode: "additive",
        values: [
          createOptionValue("8 Seiten", 0, 1),
          createOptionValue("12 Seiten", 80, 2),
          createOptionValue("16 Seiten", 160, 3),
          createOptionValue("24 Seiten", 280, 4),
        ],
      }),
      createOption({
        key: "paper_type",
        name: "Papiersorte",
        type: "select",
        order: 30,
        pricingMode: "additive",
        values: [
          createOptionValue("135g Bilderdruck", 0, 1),
          createOptionValue("170g Bilderdruck", 90, 2),
          createOptionValue("Recyclingpapier", 60, 3),
        ],
      }),
      createOption({
        key: "folding_type",
        name: "Falzart",
        type: "select",
        order: 40,
        pricingMode: "additive",
        values: [
          createOptionValue("Wickelfalz", 0, 1),
          createOptionValue("Zickzackfalz", 20, 2),
          createOptionValue("Kreuzfalz", 40, 3),
        ],
      }),
      createOption({
        key: "finishing",
        name: "Veredelung",
        type: "select",
        order: 50,
        pricingMode: "additive",
        values: [
          createOptionValue("Ohne Veredelung", 0, 1),
          createOptionValue("Mattlaminierung", 70, 2),
          createOptionValue("Glanzlaminierung", 70, 3),
        ],
      }),
    ],
  },
  {
    slug: "flyer",
    name: "Flyer",
    description:
      "Flyer in gaengigen Formaten fuer Aktionen, Veranstaltungen und Direktwerbung mit klaren Mengenstaffeln und sauberer Druckvorbereitung.",
    image:
      "https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=1600&auto=format&fit=crop",
    basePrice: 95,
    pricingMode: "quantity_tiers",
    order: 40,
    hasDesigner: false,
    hasColorPicker: false,
    fileLimit: 0,
    designerType: "none",
    isActive: true,
    configJson: buildServiceConfig({
      quantityTiers: [
        { label: "1000 Stueck", quantity: 1000, price: 95 },
        { label: "2500 Stueck", quantity: 2500, price: 165 },
        { label: "5000 Stueck", quantity: 5000, price: 290 },
      ],
      uploadFields: [
        createUploadField({
          key: "print_ready_pdf",
          label: "Druckfertiges PDF",
          helperText: "Bitte mit Beschnitt und finalem Farbprofil anlegen.",
          required: true,
          allowedFileTypesText: "pdf",
          accept: ".pdf",
          maxFiles: 1,
          maxFileSizeMb: 25,
          order: 1,
        }),
      ],
    }),
    options: [
      createOption({
        key: "format",
        name: "Format",
        type: "radio",
        order: 10,
        pricingMode: "additive",
        values: [
          createOptionValue("A6", 0, 1),
          createOptionValue("A5", 25, 2),
          createOptionValue("A4", 70, 3),
        ],
      }),
      createOption({
        key: "paper_thickness",
        name: "Papierstaerke",
        type: "select",
        order: 20,
        pricingMode: "additive",
        values: [
          createOptionValue("135g Bilderdruck", 0, 1),
          createOptionValue("170g Bilderdruck", 18, 2),
          createOptionValue("250g Bilderdruck", 35, 3),
        ],
      }),
      createOption({
        key: "sides",
        name: "Bedruckung",
        type: "radio",
        order: 30,
        pricingMode: "additive",
        values: [
          createOptionValue("Einseitig", 0, 1),
          createOptionValue("Beidseitig", 20, 2),
        ],
      }),
      createOption({
        key: "finishing",
        name: "Veredelung",
        type: "select",
        order: 40,
        pricingMode: "additive",
        values: [
          createOptionValue("Ohne Veredelung", 0, 1),
          createOptionValue("Mattlaminierung", 22, 2),
          createOptionValue("Glanzlaminierung", 22, 3),
        ],
      }),
    ],
  },
  {
    slug: "aufkleberdruck",
    name: "Aufkleberdruck",
    description:
      "Individuelle Aufkleber und Konturschnitte auf Rollen- oder Bogenmaterial mit Flaechenberechnung pro Quadratmeter und optionalen Materialaufschlaegen.",
    image:
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?q=80&w=1600&auto=format&fit=crop",
    basePrice: 50,
    pricingMode: "area",
    order: 50,
    hasDesigner: false,
    hasColorPicker: false,
    fileLimit: 0,
    designerType: "none",
    isActive: true,
    configJson: buildServiceConfig({
      area: {
        pricePerSqm: 50,
        minimumAreaSqm: 0.25,
        widthLabel: "Breite (cm)",
        heightLabel: "Hoehe (cm)",
      },
      uploadFields: [
        createUploadField({
          key: "sticker_design",
          label: "Aufkleber-Design",
          helperText: "Bitte als Vektordatei oder hochaufgeloestes PDF liefern.",
          required: true,
          allowedFileTypesText: "pdf, ai, eps, png, jpg",
          accept: ".pdf,.ai,.eps,.png,.jpg,.jpeg",
          maxFiles: 1,
          maxFileSizeMb: 25,
          order: 1,
        }),
        createUploadField({
          key: "reference_image",
          label: "Referenzbild",
          helperText: "Optional fuer Form, Anwendung oder Einbauposition.",
          required: false,
          allowedFileTypesText: "png, jpg, pdf",
          accept: ".png,.jpg,.jpeg,.pdf",
          maxFiles: 3,
          maxFileSizeMb: 15,
          allowCustomerFileLabel: true,
          order: 2,
        }),
      ],
    }),
    options: [
      createOption({
        key: "material",
        name: "Material",
        type: "select",
        order: 10,
        pricingMode: "additive",
        values: [
          createOptionValue("Standardfolie weiss", 0, 1),
          createOptionValue("Transparente Folie", 8, 2),
          createOptionValue("Outdoor Hochleistungsfolie", 12, 3),
        ],
      }),
      createOption({
        key: "lamination",
        name: "Schutzlaminat",
        type: "select",
        order: 20,
        pricingMode: "additive",
        values: [
          createOptionValue("Ohne Laminat", 0, 1),
          createOptionValue("Matt laminiert", 6, 2),
          createOptionValue("Glanz laminiert", 6, 3),
        ],
      }),
      createOption({
        key: "cut_type",
        name: "Schnittform",
        type: "radio",
        order: 30,
        pricingMode: "additive",
        values: [
          createOptionValue("Rechteckig", 0, 1),
          createOptionValue("Konturschnitt", 14, 2),
        ],
      }),
    ],
  },
  {
    slug: "bannerdruck",
    name: "Bannerdruck",
    description:
      "Grossformatige Banner fuer Innen- und Aussenwerbung mit robuster Materialauswahl, Oesen und optionaler Saumverstaerkung.",
    image:
      "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1600&auto=format&fit=crop",
    basePrice: 50,
    pricingMode: "area",
    order: 60,
    hasDesigner: false,
    hasColorPicker: false,
    fileLimit: 0,
    designerType: "none",
    isActive: true,
    configJson: buildServiceConfig({
      area: {
        pricePerSqm: 50,
        minimumAreaSqm: 1,
        widthLabel: "Breite (cm)",
        heightLabel: "Hoehe (cm)",
      },
      uploadFields: [
        createUploadField({
          key: "banner_design",
          label: "Banner-Design",
          helperText: "Bitte im finalen Massstab mit Beschnitt anlegen.",
          required: true,
          allowedFileTypesText: "pdf, ai, eps, jpg",
          accept: ".pdf,.ai,.eps,.jpg,.jpeg",
          maxFiles: 1,
          maxFileSizeMb: 50,
          order: 1,
        }),
        createUploadField({
          key: "installation_reference",
          label: "Montage-Referenz",
          helperText: "Optionales Foto fuer Befestigung oder Umgebung.",
          required: false,
          allowedFileTypesText: "png, jpg, pdf",
          accept: ".png,.jpg,.jpeg,.pdf",
          maxFiles: 3,
          maxFileSizeMb: 20,
          allowCustomerFileLabel: true,
          order: 2,
        }),
      ],
    }),
    options: [
      createOption({
        key: "material",
        name: "Material",
        type: "select",
        order: 10,
        pricingMode: "additive",
        values: [
          createOptionValue("PVC Banner 510g", 0, 1),
          createOptionValue("Mesh Banner", 8, 2),
          createOptionValue("Blockout Banner", 10, 3),
        ],
      }),
      createOption({
        key: "eyelets",
        name: "Oesen",
        type: "radio",
        order: 20,
        pricingMode: "additive",
        values: [
          createOptionValue("Ohne Oesen", 0, 1),
          createOptionValue("Alle 50 cm", 12, 2),
        ],
      }),
      createOption({
        key: "reinforced_edges",
        name: "Verstaerkter Rand",
        type: "radio",
        order: 30,
        pricingMode: "additive",
        values: [
          createOptionValue("Ohne Saum", 0, 1),
          createOptionValue("Saum und Schweissnaht", 10, 2),
        ],
      }),
    ],
  },
  {
    slug: "alu-dibond-schilder",
    name: "Alu-Dibond Schilder",
    description:
      "Robuste Verbundplatten fuer Firmenbeschilderung, Leitsysteme und hochwertige Fassadenanwendungen mit Flaechenpreis und Montageoptionen.",
    image:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1600&auto=format&fit=crop",
    basePrice: 95,
    pricingMode: "area",
    order: 70,
    hasDesigner: false,
    hasColorPicker: false,
    fileLimit: 0,
    designerType: "none",
    isActive: true,
    configJson: buildServiceConfig({
      area: {
        pricePerSqm: 95,
        minimumAreaSqm: 0.5,
        widthLabel: "Breite (cm)",
        heightLabel: "Hoehe (cm)",
      },
      uploadFields: [
        createUploadField({
          key: "print_file",
          label: "Druckdatei",
          helperText: "Bitte als druckfertiges PDF oder Vektordatei hochladen.",
          required: true,
          allowedFileTypesText: "pdf, ai, eps",
          accept: ".pdf,.ai,.eps",
          maxFiles: 1,
          maxFileSizeMb: 50,
          order: 1,
        }),
        createUploadField({
          key: "installation_reference",
          label: "Montage-Referenz",
          helperText: "Optionales Foto fuer Bohrbild oder Einbausituation.",
          required: false,
          allowedFileTypesText: "png, jpg, pdf",
          accept: ".png,.jpg,.jpeg,.pdf",
          maxFiles: 3,
          maxFileSizeMb: 20,
          allowCustomerFileLabel: true,
          order: 2,
        }),
      ],
    }),
    options: [
      createOption({
        key: "thickness",
        name: "Staerke",
        type: "radio",
        order: 10,
        pricingMode: "additive",
        values: [
          createOptionValue("3 mm", 0, 1),
          createOptionValue("6 mm", 18, 2),
        ],
      }),
      createOption({
        key: "finish",
        name: "Oberflaeche",
        type: "select",
        order: 20,
        pricingMode: "additive",
        values: [
          createOptionValue("Direktdruck matt", 0, 1),
          createOptionValue("Schutzlaminat matt", 20, 2),
          createOptionValue("Schutzlaminat glanz", 20, 3),
        ],
      }),
      createOption({
        key: "mounting_holes",
        name: "Bohrungen",
        type: "select",
        order: 30,
        pricingMode: "additive",
        values: [
          createOptionValue("Ohne Bohrungen", 0, 1),
          createOptionValue("4 Ecken", 15, 2),
          createOptionValue("Individuelles Bohrbild", 25, 3),
        ],
      }),
      createOption({
        key: "use_case",
        name: "Einsatzbereich",
        type: "radio",
        order: 40,
        pricingMode: "additive",
        values: [
          createOptionValue("Innenbereich", 0, 1),
          createOptionValue("Aussenbereich", 10, 2),
        ],
      }),
    ],
  },
  {
    slug: "3d-buchstaben",
    name: "3D-Buchstaben",
    description:
      "Individuelle 3D-Logos und Profilbuchstaben fuer Fassade, Innenraum oder Ladenbau. Dieses Produkt wird standardmaessig als Anfrageleistung angelegt.",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1600&auto=format&fit=crop",
    basePrice: 950,
    pricingMode: "custom_quote",
    order: 80,
    hasDesigner: false,
    hasColorPicker: false,
    fileLimit: 0,
    designerType: "none",
    isActive: true,
    configJson: buildServiceConfig({
      uploadFields: [
        createUploadField({
          key: "logo_vector",
          label: "Logo oder Vektordatei",
          helperText: "Moeglichst als AI, EPS, PDF oder SVG liefern.",
          required: true,
          allowedFileTypesText: "ai, eps, pdf, svg",
          accept: ".ai,.eps,.pdf,.svg",
          maxFiles: 1,
          maxFileSizeMb: 25,
          order: 1,
        }),
        createUploadField({
          key: "reference_image",
          label: "Referenzbild",
          helperText: "Optional fuer Stil, Oberflaeche oder Vorbild.",
          required: false,
          allowedFileTypesText: "png, jpg, pdf",
          accept: ".png,.jpg,.jpeg,.pdf",
          maxFiles: 3,
          maxFileSizeMb: 15,
          allowCustomerFileLabel: true,
          order: 2,
        }),
        createUploadField({
          key: "installation_photo",
          label: "Foto vom Montageort",
          helperText: "Optional fuer Angebot und Produktionsplanung.",
          required: false,
          allowedFileTypesText: "png, jpg, pdf",
          accept: ".png,.jpg,.jpeg,.pdf",
          maxFiles: 5,
          maxFileSizeMb: 20,
          allowCustomerFileLabel: true,
          order: 3,
        }),
      ],
    }),
    options: [
      createOption({
        key: "material",
        name: "Material",
        type: "select",
        order: 10,
        pricingMode: "included",
        values: [
          createOptionValue("Acryl", 0, 1),
          createOptionValue("PVC Hartschaum", 0, 2),
          createOptionValue("Aluminium", 0, 3),
          createOptionValue("Edelstahl", 0, 4),
        ],
      }),
      createOption({
        key: "letter_height",
        name: "Buchstabenhoehe",
        type: "select",
        order: 20,
        pricingMode: "included",
        values: [
          createOptionValue("20 cm", 0, 1),
          createOptionValue("30 cm", 0, 2),
          createOptionValue("50 cm", 0, 3),
          createOptionValue("Individuell", 0, 4),
        ],
      }),
      createOption({
        key: "depth",
        name: "Tiefe / Staerke",
        type: "radio",
        order: 30,
        pricingMode: "included",
        values: [
          createOptionValue("10 mm", 0, 1),
          createOptionValue("20 mm", 0, 2),
          createOptionValue("30 mm", 0, 3),
        ],
      }),
      createOption({
        key: "lighting",
        name: "Beleuchtung",
        type: "select",
        order: 40,
        pricingMode: "included",
        values: [
          createOptionValue("Unbeleuchtet", 0, 1),
          createOptionValue("Frontleuchter", 0, 2),
          createOptionValue("Rueckleuchter", 0, 3),
        ],
      }),
      createOption({
        key: "location",
        name: "Einsatzort",
        type: "radio",
        order: 50,
        pricingMode: "included",
        values: [
          createOptionValue("Innenbereich", 0, 1),
          createOptionValue("Aussenbereich", 0, 2),
        ],
      }),
    ],
  },
  {
    slug: "lochfolie-fenster",
    name: "Lochfolie fuer Fenster",
    description:
      "Perforierte Fensterfolien fuer Schaufenster und Fahrzeugflaechen mit Sichtschutz, Werbewirkung und Flaechenberechnung pro Quadratmeter.",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1600&auto=format&fit=crop",
    basePrice: 65,
    pricingMode: "area",
    order: 90,
    hasDesigner: false,
    hasColorPicker: false,
    fileLimit: 0,
    designerType: "none",
    isActive: true,
    configJson: buildServiceConfig({
      area: {
        pricePerSqm: 65,
        minimumAreaSqm: 1,
        widthLabel: "Breite (cm)",
        heightLabel: "Hoehe (cm)",
      },
      uploadFields: [
        createUploadField({
          key: "design_file",
          label: "Design-Datei",
          helperText: "Bitte als druckfertige Datei im Endformat liefern.",
          required: true,
          allowedFileTypesText: "pdf, ai, eps, jpg",
          accept: ".pdf,.ai,.eps,.jpg,.jpeg",
          maxFiles: 1,
          maxFileSizeMb: 50,
          order: 1,
        }),
        createUploadField({
          key: "window_photo",
          label: "Fensterfoto",
          helperText: "Optional fuer Konturen, Teilung oder Montagehinweise.",
          required: false,
          allowedFileTypesText: "png, jpg, pdf",
          accept: ".png,.jpg,.jpeg,.pdf",
          maxFiles: 3,
          maxFileSizeMb: 20,
          allowCustomerFileLabel: true,
          order: 2,
        }),
      ],
    }),
    options: [
      createOption({
        key: "installation_side",
        name: "Montageseite",
        type: "radio",
        order: 10,
        pricingMode: "additive",
        values: [
          createOptionValue("Von innen", 0, 1),
          createOptionValue("Von aussen", 12, 2),
        ],
      }),
      createOption({
        key: "lamination",
        name: "Schutzlaminat",
        type: "radio",
        order: 20,
        pricingMode: "additive",
        values: [
          createOptionValue("Ohne Laminat", 0, 1),
          createOptionValue("Mit Schutzlaminat", 10, 2),
        ],
      }),
      createOption({
        key: "window_type",
        name: "Fenstertyp",
        type: "select",
        order: 30,
        pricingMode: "additive",
        values: [
          createOptionValue("Schaufenster", 0, 1),
          createOptionValue("Fahrzeugfenster", 15, 2),
        ],
      }),
    ],
  },
  {
    slug: "webdesign",
    name: "Webdesign",
    description:
      "Professionelles Webdesign fuer Unternehmen, Marken und digitale Kampagnen. Dieses Produkt wird bewusst als Anfrageleistung konfiguriert.",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1600&auto=format&fit=crop",
    basePrice: 1800,
    pricingMode: "custom_quote",
    order: 100,
    hasDesigner: false,
    hasColorPicker: false,
    fileLimit: 0,
    designerType: "none",
    isActive: true,
    configJson: buildServiceConfig({
      uploadFields: [
        createUploadField({
          key: "logo",
          label: "Logo",
          helperText: "Bitte als PNG, SVG, PDF oder AI liefern.",
          required: true,
          allowedFileTypesText: "svg, pdf, ai, png",
          accept: ".svg,.pdf,.ai,.png",
          maxFiles: 3,
          maxFileSizeMb: 20,
          allowCustomerFileLabel: true,
          order: 1,
        }),
        createUploadField({
          key: "brand_assets",
          label: "Brand Assets",
          helperText: "Farben, Schriften, Bildwelten oder vorhandene CI-Dateien.",
          required: false,
          allowedFileTypesText: "pdf, zip, png, jpg, svg",
          accept: ".pdf,.zip,.png,.jpg,.jpeg,.svg",
          maxFiles: 10,
          maxFileSizeMb: 50,
          allowCustomerFileLabel: true,
          order: 2,
        }),
        createUploadField({
          key: "reference_websites",
          label: "Referenz-Websites oder Screenshots",
          helperText: "Bitte als PDF, PNG oder JPG bereitstellen.",
          required: false,
          allowedFileTypesText: "pdf, png, jpg",
          accept: ".pdf,.png,.jpg,.jpeg",
          maxFiles: 5,
          maxFileSizeMb: 20,
          allowCustomerFileLabel: true,
          order: 3,
        }),
        createUploadField({
          key: "content_file",
          label: "Content-Datei",
          helperText: "Optional fuer Texte, Struktur oder Inhaltsuebergabe.",
          required: false,
          allowedFileTypesText: "pdf, docx, txt, zip",
          accept: ".pdf,.docx,.txt,.zip",
          maxFiles: 5,
          maxFileSizeMb: 25,
          allowCustomerFileLabel: true,
          order: 4,
        }),
      ],
    }),
    options: [
      createOption({
        key: "website_type",
        name: "Website-Typ",
        type: "select",
        order: 10,
        pricingMode: "included",
        values: [
          createOptionValue("Landingpage", 0, 1),
          createOptionValue("Unternehmenswebsite", 0, 2),
          createOptionValue("Portfolio", 0, 3),
          createOptionValue("Onlineshop", 0, 4),
        ],
      }),
      createOption({
        key: "page_count",
        name: "Seitenanzahl",
        type: "select",
        order: 20,
        pricingMode: "included",
        values: [
          createOptionValue("1 bis 5 Seiten", 0, 1),
          createOptionValue("6 bis 10 Seiten", 0, 2),
          createOptionValue("Mehr als 10 Seiten", 0, 3),
        ],
      }),
      createOption({
        key: "language_count",
        name: "Sprachversionen",
        type: "radio",
        order: 30,
        pricingMode: "included",
        values: [
          createOptionValue("1 Sprache", 0, 1),
          createOptionValue("2 Sprachen", 0, 2),
          createOptionValue("3 oder mehr", 0, 3),
        ],
      }),
      createOption({
        key: "ecommerce",
        name: "E-Commerce",
        type: "radio",
        order: 40,
        pricingMode: "included",
        values: [
          createOptionValue("Nein", 0, 1),
          createOptionValue("Ja", 0, 2),
        ],
      }),
      createOption({
        key: "content_ready",
        name: "Inhalte bereits vorhanden",
        type: "radio",
        order: 50,
        pricingMode: "included",
        values: [
          createOptionValue("Nein", 0, 1),
          createOptionValue("Teilweise", 0, 2),
          createOptionValue("Ja", 0, 3),
        ],
      }),
    ],
  },
  {
    slug: "speisekarten",
    name: "Speisekarten",
    description:
      "Speisekarten fuer Gastronomie, Cafes und Hotels mit robusten Materialien, klaren Aufpreisen und passender Upload-Struktur fuer Inhalte und Assets.",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1600&auto=format&fit=crop",
    basePrice: 45,
    pricingMode: "option_based",
    order: 110,
    hasDesigner: false,
    hasColorPicker: false,
    fileLimit: 0,
    designerType: "none",
    isActive: true,
    configJson: buildServiceConfig({
      uploadFields: [
        createUploadField({
          key: "menu_content",
          label: "Menue-Inhalt",
          helperText: "Bitte als PDF, DOCX oder TXT bereitstellen.",
          required: true,
          allowedFileTypesText: "pdf, docx, txt",
          accept: ".pdf,.docx,.txt",
          maxFiles: 3,
          maxFileSizeMb: 20,
          allowCustomerFileLabel: true,
          order: 1,
        }),
        createUploadField({
          key: "logo_assets",
          label: "Logo und Assets",
          helperText: "Optional fuer CI, Fotos oder vorhandene Designelemente.",
          required: false,
          allowedFileTypesText: "pdf, png, jpg, svg, zip",
          accept: ".pdf,.png,.jpg,.jpeg,.svg,.zip",
          maxFiles: 10,
          maxFileSizeMb: 40,
          allowCustomerFileLabel: true,
          order: 2,
        }),
        createUploadField({
          key: "reference_design",
          label: "Referenzdesign",
          helperText: "Optional fuer Stilrichtung oder bestehende Karten.",
          required: false,
          allowedFileTypesText: "pdf, png, jpg",
          accept: ".pdf,.png,.jpg,.jpeg",
          maxFiles: 5,
          maxFileSizeMb: 20,
          allowCustomerFileLabel: true,
          order: 3,
        }),
      ],
    }),
    options: [
      createOption({
        key: "menu_type",
        name: "Menue-Typ",
        type: "select",
        order: 10,
        pricingMode: "additive",
        values: [
          createOptionValue("Einblatt", 0, 1),
          createOptionValue("Klappkarte", 12, 2),
          createOptionValue("Mehrseitige Speisekarte", 28, 3),
        ],
      }),
      createOption({
        key: "size",
        name: "Format",
        type: "select",
        order: 20,
        pricingMode: "additive",
        values: [
          createOptionValue("A5", 0, 1),
          createOptionValue("A4", 8, 2),
          createOptionValue("DL lang", 6, 3),
        ],
      }),
      createOption({
        key: "page_count",
        name: "Seitenumfang",
        type: "select",
        order: 30,
        pricingMode: "additive",
        values: [
          createOptionValue("2 Seiten", 0, 1),
          createOptionValue("4 Seiten", 15, 2),
          createOptionValue("8 Seiten", 35, 3),
        ],
      }),
      createOption({
        key: "lamination",
        name: "Laminierung",
        type: "select",
        order: 40,
        pricingMode: "additive",
        values: [
          createOptionValue("Ohne Laminierung", 0, 1),
          createOptionValue("Matt laminiert", 10, 2),
          createOptionValue("Abwischbar Premium", 18, 3),
        ],
      }),
    ],
  },
  {
    slug: "werbevideos-screens",
    name: "Werbevideos fuer Screens",
    description:
      "Promotional Screen Videos fuer Ladenflaechen, Messen, Digital Signage und Social-Screen-Loops. Das Produkt ist als Anfrageleistung vorbereitet.",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1600&auto=format&fit=crop",
    basePrice: 1200,
    pricingMode: "custom_quote",
    order: 120,
    hasDesigner: false,
    hasColorPicker: false,
    fileLimit: 0,
    designerType: "none",
    isActive: true,
    configJson: buildServiceConfig({
      uploadFields: [
        createUploadField({
          key: "logo",
          label: "Logo",
          helperText: "Bitte als PNG, SVG oder PDF bereitstellen.",
          required: true,
          allowedFileTypesText: "png, svg, pdf",
          accept: ".png,.svg,.pdf",
          maxFiles: 3,
          maxFileSizeMb: 20,
          allowCustomerFileLabel: true,
          order: 1,
        }),
        createUploadField({
          key: "product_images",
          label: "Produktbilder",
          helperText: "Mehrere Bilder koennen gesammelt hochgeladen werden.",
          required: false,
          allowedFileTypesText: "png, jpg, jpeg",
          accept: ".png,.jpg,.jpeg",
          maxFiles: 10,
          maxFileSizeMb: 20,
          allowCustomerFileLabel: true,
          order: 2,
        }),
        createUploadField({
          key: "text_content",
          label: "Text- oder Inhaltsdatei",
          helperText: "Bitte Claims, Produkttexte oder Storyboard-Notizen hochladen.",
          required: true,
          allowedFileTypesText: "pdf, docx, txt",
          accept: ".pdf,.docx,.txt",
          maxFiles: 5,
          maxFileSizeMb: 20,
          allowCustomerFileLabel: true,
          order: 3,
        }),
        createUploadField({
          key: "reference_video",
          label: "Referenzvideo",
          helperText: "Optional als Inspirationsgrundlage oder bestehendes Beispiel.",
          required: false,
          allowedFileTypesText: "mp4, mov, pdf",
          accept: ".mp4,.mov,.pdf",
          maxFiles: 3,
          maxFileSizeMb: 50,
          allowCustomerFileLabel: true,
          order: 4,
        }),
      ],
    }),
    options: [
      createOption({
        key: "video_duration",
        name: "Videolaenge",
        type: "select",
        order: 10,
        pricingMode: "included",
        values: [
          createOptionValue("15 Sekunden", 0, 1),
          createOptionValue("30 Sekunden", 0, 2),
          createOptionValue("60 Sekunden", 0, 3),
        ],
      }),
      createOption({
        key: "screen_orientation",
        name: "Bildschirmformat",
        type: "radio",
        order: 20,
        pricingMode: "included",
        values: [
          createOptionValue("Querformat", 0, 1),
          createOptionValue("Hochformat", 0, 2),
          createOptionValue("Square", 0, 3),
        ],
      }),
      createOption({
        key: "version_count",
        name: "Anzahl Versionen",
        type: "select",
        order: 30,
        pricingMode: "included",
        values: [
          createOptionValue("1 Version", 0, 1),
          createOptionValue("2 Versionen", 0, 2),
          createOptionValue("3 oder mehr", 0, 3),
        ],
      }),
      createOption({
        key: "animation_level",
        name: "Animationsniveau",
        type: "select",
        order: 40,
        pricingMode: "included",
        values: [
          createOptionValue("Basis", 0, 1),
          createOptionValue("Erweitert", 0, 2),
          createOptionValue("High-End", 0, 3),
        ],
      }),
      createOption({
        key: "voiceover",
        name: "Sprechertext",
        type: "radio",
        order: 50,
        pricingMode: "included",
        values: [
          createOptionValue("Nein", 0, 1),
          createOptionValue("Ja", 0, 2),
        ],
      }),
    ],
  },
];

async function upsertService(serviceDefinition) {
  return prisma.$transaction(async (tx) => {
    const service = await tx.service.upsert({
      where: { slug: serviceDefinition.slug },
      create: {
        name: serviceDefinition.name,
        slug: serviceDefinition.slug,
        description: serviceDefinition.description,
        image: serviceDefinition.image,
        basePrice: serviceDefinition.basePrice,
        pricingMode: serviceDefinition.pricingMode,
        configJson: serviceDefinition.configJson,
        isActive: serviceDefinition.isActive,
        order: serviceDefinition.order,
        hasDesigner: serviceDefinition.hasDesigner,
        hasColorPicker: serviceDefinition.hasColorPicker,
        fileLimit: serviceDefinition.fileLimit,
        designerType: serviceDefinition.designerType,
      },
      update: {
        name: serviceDefinition.name,
        description: serviceDefinition.description,
        image: serviceDefinition.image,
        basePrice: serviceDefinition.basePrice,
        pricingMode: serviceDefinition.pricingMode,
        configJson: serviceDefinition.configJson,
        isActive: serviceDefinition.isActive,
        order: serviceDefinition.order,
        hasDesigner: serviceDefinition.hasDesigner,
        hasColorPicker: serviceDefinition.hasColorPicker,
        fileLimit: serviceDefinition.fileLimit,
        designerType: serviceDefinition.designerType,
      },
    });

    await tx.serviceOption.deleteMany({
      where: { serviceId: service.id },
    });

    for (const option of serviceDefinition.options) {
      await tx.serviceOption.create({
        data: {
          serviceId: service.id,
          key: option.key,
          name: option.name,
          type: option.type,
          isRequired: option.isRequired,
          order: option.order,
          helperText: option.helperText,
          pricingMode: option.pricingMode,
          configJson: option.configJson,
          values:
            option.values.length > 0
              ? {
                  create: option.values.map((value) => ({
                    name: value.name,
                    price: value.price,
                    order: value.order,
                    metadataJson: value.metadataJson,
                  })),
                }
              : undefined,
        },
      });
    }

    return service;
  });
}

async function main() {
  console.log(`Updating ${SERVICES.length} services...`);

  for (const service of SERVICES) {
    const savedService = await upsertService(service);
    console.log(`Upserted: ${savedService.name} (${savedService.slug})`);
  }

  console.log("Service catalog update complete.");
}

main()
  .catch((error) => {
    console.error("Service catalog update failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
