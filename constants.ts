
import { MenuCategory, ModifierGroup, PizzaIngredient } from './types';

export const DELIVERY_PROMO_DAYS = [1, 2, 3, 4];
export const TOGO_ORDER_START_NUMBER = 101;

// ============= PRECIOS BASE DE PIZZA =============
export const PIZZA_BASE_PRICES = {
  'Pequeña': 5,
  'Mediana': 10,
  'Familiar': 11
};

// ============= INGREDIENTES DE PIZZA =============
export const PIZZA_INGREDIENTS: PizzaIngredient[] = [
  // Categoría A - Ingredientes Premium
  { name: 'Jamón', category: 'A', prices: { Pequeña: 1, Mediana: 3, Familiar: 3 } },
  { name: 'Pepperoni', category: 'A', prices: { Pequeña: 1, Mediana: 3, Familiar: 3 } },
  { name: 'Maíz', category: 'A', prices: { Pequeña: 1, Mediana: 3, Familiar: 3 } },
  { name: 'Queso Amarillo', category: 'A', prices: { Pequeña: 1, Mediana: 3, Familiar: 3 } },
  { name: 'Champiñones', category: 'A', prices: { Pequeña: 1, Mediana: 3, Familiar: 3 } },
  { name: 'Aceitunas Negras', category: 'A', prices: { Pequeña: 1, Mediana: 3, Familiar: 3 } },

  // Categoría B - Ingredientes Básicos
  { name: 'Cebolla', category: 'B', prices: { Pequeña: 0.5, Mediana: 1, Familiar: 1 } },
  { name: 'Pimentón', category: 'B', prices: { Pequeña: 0.5, Mediana: 1, Familiar: 1 } },
  { name: 'Tomates', category: 'B', prices: { Pequeña: 0.5, Mediana: 1, Familiar: 1 } },

  // Categoría C - Ingredientes Especiales
  { name: 'Tocineta', category: 'C', prices: { Pequeña: 2, Mediana: 4, Familiar: 4 } },
];

// Ingredientes por defecto de pizzas especiales
export const SPECIAL_PIZZA_INGREDIENTS: Record<string, string[]> = {
  'Pizza Keclick': ['Maíz', 'Cebolla', 'Pimentón', 'Aceitunas Negras', 'Champiñones'],
  'Pizza Caprichosa': ['Jamón', 'Tocineta', 'Pepperoni', 'Queso Amarillo'],
  'Pizza 4 Quesos': [], // Solo quesos del base
  'Pizza Bianca': ['Tocineta', 'Champiñones'], // + pollo al grill (en descripción)
};

// --- GRUPOS DE MODIFICADORES ---
export const KECLICK_MODIFIERS: ModifierGroup[] = [
  {
    title: "Elige tu Proteína",
    selectionType: "single", minSelection: 1, maxSelection: 1,
    options: [
      { name: "Pollo", price: 0 },
      { name: "Carne", price: 0 },
      { name: "Cerdo", price: 0 },
      { name: "Crispy", price: 0 }
    ],
  },
  {
    title: "Personaliza (Opcional)",
    selectionType: "multiple", minSelection: 0, maxSelection: 10,
    options: [
      { name: "Sin Lechuga", price: 0 },
      { name: "Sin Tomate", price: 0 },
      { name: "Sin Cebolla", price: 0 },
      { name: "Sin Repollo", price: 0 },
      { name: "Sin Mayonesa", price: 0 },
      { name: "Sin Salsa Roja", price: 0 },
      { name: "Sin Mostaza", price: 0 },
      { name: "Extra Queso", price: 1 },
    ],
  },
  {
    title: "Proteínas para Mixto",
    selectionType: "multiple", minSelection: 2, maxSelection: 2,
    options: [
      { name: "Pollo", price: 0 },
      { name: "Carne", price: 0 },
      { name: "Cerdo", price: 0 },
      { name: "Crispy", price: 0 }
    ],
  },
  {
    title: "Tamaño de Pizza",
    selectionType: "single", minSelection: 1, maxSelection: 1,
    options: [
      { name: "Pequeña", price: 5 },
      { name: "Mediana", price: 10 },
      { name: "Familiar", price: 11 }
    ],
  },
  {
    title: "Sabor de Pizza (Individual)",
    selectionType: "single", minSelection: 1, maxSelection: 1,
    options: [
      { name: "Jamón", price: 0 },
      { name: "Pepperoni", price: 0 },
      { name: "Maíz", price: 0 },
      { name: "Queso Amarillo", price: 0 },
      { name: "Champiñones", price: 0 },
      { name: "Aceitunas", price: 0 }
    ],
  },
  {
    title: "Sabor de Pizza (Familiar)",
    selectionType: "single", minSelection: 1, maxSelection: 1,
    options: [
      { name: "Jamón", price: 0 },
      { name: "Pepperoni", price: 0 },
      { name: "Maíz", price: 0 },
      { name: "Queso Amarillo", price: 0 },
      { name: "Champiñones", price: 0 },
      { name: "Aceitunas", price: 0 }
    ],
  },
  {
    title: "Sabor Pizza 2 (Familiar)",
    selectionType: "single", minSelection: 1, maxSelection: 1,
    options: [
      { name: "Jamón", price: 0 },
      { name: "Pepperoni", price: 0 },
      { name: "Maíz", price: 0 },
      { name: "Queso Amarillo", price: 0 },
      { name: "Champiñones", price: 0 },
      { name: "Aceitunas", price: 0 }
    ],
  }
];

// --- DATOS DEL MENÚ KECLICK (PIZZERÍA) ---
export const KECLICK_MENU_DATA: MenuCategory[] = [
  {
    title: 'ENTRADAS',
    items: [
      { name: 'Tequeños (8 Mini)', price: 5, available: true, description: '8 mini tequeños + salsa tártara' },
      { name: 'Tenders de Pollo', price: 4, available: true, description: 'Servicio de tenders de pollo' },
      { name: 'Papas Fritas', price: 3, available: true, description: 'Papas a la francesa' }
    ]
  },
  {
    title: 'ARMA TU PIZZA',
    items: [
      {
        name: 'Pizza Personalizada',
        price: 5, // Precio base pequeña
        available: true,
        description: 'Salsa napolitana + Queso mozzarella. Masa tradicional, borde de queso. Elige tamaño e ingredientes.',
        isPizza: true
      }
    ]
  },
  {
    title: 'PIZZAS ESPECIALES',
    items: [
      {
        name: 'Pizza Keclick',
        price: 18,
        available: true,
        description: 'Salsa napolitana, maíz, cebolla, pimentón, aceitunas negras y champiñones',
        isSpecialPizza: true,
        defaultIngredients: ['Maíz', 'Cebolla', 'Pimentón', 'Aceitunas Negras', 'Champiñones']
      },
      {
        name: 'Pizza Caprichosa',
        price: 20,
        available: true,
        description: 'Salsa napolitana, jamón, tocineta, pepperoni, queso amarillo',
        isSpecialPizza: true,
        defaultIngredients: ['Jamón', 'Tocineta', 'Pepperoni', 'Queso Amarillo']
      },
      {
        name: 'Pizza 4 Quesos',
        price: 20,
        available: true,
        description: 'Salsa napolitana, queso mozzarella, queso parmesano, queso pecorino, queso azul',
        isSpecialPizza: true,
        defaultIngredients: []
      },
      {
        name: 'Pizza Bianca',
        price: 20,
        available: true,
        description: 'Salsa blanca (queso crema), mozzarella, tocineta, champiñones, pollo al grill',
        isSpecialPizza: true,
        defaultIngredients: ['Tocineta', 'Champiñones']
      }
    ]
  },
  {
    title: 'COMBOS',
    items: [
      {
        name: 'Combo 1',
        price: 15,
        available: true,
        description: '1 Pizza familiar con borde de queso + 1 ingrediente + Coca Cola 1.5 lts',
        isCombo: true,
        comboIncludes: ['1 Pizza Familiar', '1 Ingrediente', 'Coca Cola 1.5L'],
        modifierGroupTitles: ['Sabor de Pizza (Familiar)']
      },
      {
        name: 'Combo 2',
        price: 18,
        available: true,
        description: '1 Pizza familiar con borde de queso + 1 ingrediente + 8 minitequeños + salsa + Coca Cola 1.5 lts',
        isCombo: true,
        comboIncludes: ['1 Pizza Familiar', '1 Ingrediente', '8 Minitequeños', 'Salsa', 'Coca Cola 1.5L'],
        modifierGroupTitles: ['Sabor de Pizza (Familiar)']
      },
      {
        name: 'Combo 3',
        price: 20,
        available: true,
        description: '1 Pizza familiar + 1 individual con borde de queso + 1 ingrediente c/u + Coca Cola 1.5 lts',
        isCombo: true,
        comboIncludes: ['1 Pizza Familiar', '1 Pizza Individual', '1 Ingrediente c/u', 'Coca Cola 1.5L'],
        modifierGroupTitles: ['Sabor de Pizza (Familiar)', 'Sabor de Pizza (Individual)']
      },
      {
        name: 'Combo 4',
        price: 28,
        available: true,
        description: '2 Pizzas familiares con borde de queso + 1 ingrediente c/u + Coca Cola 1.5 lts',
        isCombo: true,
        comboIncludes: ['2 Pizzas Familiares', '1 Ingrediente c/u', 'Coca Cola 1.5L'],
        modifierGroupTitles: ['Sabor de Pizza (Familiar)', 'Sabor Pizza 2 (Familiar)']
      },
      {
        name: 'Combo 5 (4 Estaciones)',
        price: 17,
        available: true,
        description: '1 Pizza familiar con borde de queso, 4 estaciones con los ingredientes de tu preferencia',
        isCombo: true,
        comboIncludes: ['1 Pizza Familiar 4 Estaciones', 'Ingredientes a elección']
      }
    ]
  },
  {
    title: 'PATACONES',
    items: [
      {
        name: 'Patacón Sencillo',
        price: 9,
        available: true,
        description: 'Patacón con 1 proteína a elección, queso cebú, jamón, vegetales y salsas.',
        modifierGroupTitles: ["Elige tu Proteína", "Personaliza (Opcional)"]
      },
      {
        name: 'Patacón Mixto (2 Proteínas)',
        price: 11,
        available: true,
        description: 'Patacón con 2 proteínas a elección, queso cebú, jamón, vegetales y salsas.',
        modifierGroupTitles: ["Proteínas para Mixto", "Personaliza (Opcional)"]
      }
    ]
  },
  {
    title: 'TACOS',
    items: [
      {
        name: 'Taco Sencillo',
        price: 9,
        available: true,
        description: 'Taco con 1 proteína a elección, queso cebú, jamón, vegetales y salsas.',
        modifierGroupTitles: ["Elige tu Proteína", "Personaliza (Opcional)"]
      },
      {
        name: 'Taco Mixto (2 Proteínas)',
        price: 11,
        available: true,
        description: 'Taco con 2 proteínas a elección, queso cebú, jamón, vegetales y salsas.',
        modifierGroupTitles: ["Proteínas para Mixto", "Personaliza (Opcional)"]
      }
    ]
  },
  {
    title: 'HAMBURGUESAS Y MÁS',
    items: [
      {
        name: 'Hamburguesa Callejera',
        price: 9,
        available: true,
        description: 'Pan de la casa 220gr de proteína (pollo, carne, crispy o cerdo), una rueda de queso cebú, jamón, queso amarillo, lechuga, tomate, mayonesa, salsa roja, mostaza, y papas ralladas',
        modifierGroupTitles: ["Elige tu Proteína", "Personaliza (Opcional)"]
      },
      {
        name: 'Tacos / Burritos',
        price: 9,
        available: true,
        description: '200gr proteína (lomo de cerdo, pollo, carne) papas ralladas, jamón, queso amarillo, una rueda de queso cebú, lechuga, repollo, tomate, mayonesa, salsa roja y mostaza',
        modifierGroupTitles: ["Elige tu Proteína", "Personaliza (Opcional)"]
      },
      {
        name: 'Patacón Callejero',
        price: 9,
        available: true,
        description: '200 gr de proteína (Pollo, carne o lomo de cerdo), una rueda de queso cebú, queso amarillo y jamón ahumado, lechuga, tomate, mayonesa, salsa roja y mostaza',
        modifierGroupTitles: ["Elige tu Proteína", "Personaliza (Opcional)"]
      }
    ]
  },
  {
    title: 'PANES',
    items: [
      { name: 'Pan Sencillo', price: 2, available: true, description: 'Pan de la casa, salchicha o huevo papas ralladas, lechuga, tomate, mayonesa, salsa roja, mostaza' },
      { name: 'Pan Especial', price: 3, available: true, description: 'Pan de la casa, salchicha o huevo papas ralladas, media rueda de queso cebú, lechuga, tomate, mayonesa, salsa roja, mostaza' }
    ]
  },
  {
    title: 'AREPA',
    items: [
      {
        name: 'Arepa Keclick',
        price: 9,
        available: true,
        description: '1 Proteína (Pollo, carne, puerco) con pico de gallo, queso rallado, salsa tártara',
        modifierGroupTitles: ["Elige tu Proteína"]
      }
    ]
  },
  {
    title: 'POSTRES',
    items: [
      { name: 'Torta de Chocolate', price: 8, available: true },
      { name: 'Quesillo', price: 5, available: true },
      { name: 'Torta Tres Leches', price: 7, available: true },
      { name: 'Pie de Limón', price: 6, available: true },
      { name: 'Marquesa de Pudín', price: 7, available: true }
    ]
  },
  {
    title: 'BEBIDAS',
    items: [
      { name: 'Coca Cola 1.5 lts', price: 2.5, available: true },
      { name: 'Nestea de Vaso', price: 1.5, available: true },
      { name: 'Coca Cola 350ml', price: 1, available: true },
      { name: 'Agua 600ml', price: 1, available: true },
      { name: 'Cerveza', price: 1.5, available: true },
      { name: 'Balde de 10 Cervezas', price: 10, available: true }
    ]
  },
  {
    title: 'COCTELES',
    items: [
      { name: 'Keclick', price: 5, available: true },
      { name: 'Piña Colada', price: 5, available: true },
      { name: 'Daiquiri de Fresa', price: 5, available: true },
      { name: 'Mojito', price: 5, available: true },
      { name: 'Cuba Libre', price: 5, available: true },
      { name: 'Sangría', price: 5, available: true },
      { name: 'Vaso de Whisky', price: 6, available: true }
    ]
  }
];

export const CLEAN_MENU_TEMPLATE: MenuCategory[] = [
  {
    title: 'ENTRADAS',
    items: []
  },
  {
    title: 'PLATOS PRINCIPALES',
    items: []
  }
];
