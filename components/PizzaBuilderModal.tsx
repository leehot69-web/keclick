
import React, { useState, useMemo } from 'react';
import { MenuItem, PizzaSize, PizzaIngredient, PizzaHalf, PizzaIngredientSelection, PizzaConfiguration, CartItem } from '../types';
import { PIZZA_BASE_PRICES, PIZZA_INGREDIENTS } from '../constants';

interface PizzaBuilderModalProps {
    item: MenuItem;
    onClose: () => void;
    onSubmit: (item: MenuItem, pizzaConfig: PizzaConfiguration, quantity: number) => void;
    initialCartItem?: CartItem | null;
    activeRate: number;
    isSpecialPizza?: boolean;
    defaultIngredients?: string[];
}

const PizzaBuilderModal: React.FC<PizzaBuilderModalProps> = ({
    item,
    onClose,
    onSubmit,
    initialCartItem,
    activeRate,
    isSpecialPizza = false,
    defaultIngredients = []
}) => {
    // Estados
    const [size, setSize] = useState<PizzaSize>(
        initialCartItem?.pizzaConfig?.size || (isSpecialPizza ? 'Familiar' : 'Mediana')
    );
    const [selectedHalf, setSelectedHalf] = useState<PizzaHalf>('full');
    const [ingredients, setIngredients] = useState<PizzaIngredientSelection[]>(() => {
        if (initialCartItem?.pizzaConfig?.ingredients) {
            return initialCartItem.pizzaConfig.ingredients;
        }
        // Para pizzas especiales, agregar ingredientes por defecto como "full"
        if (isSpecialPizza && defaultIngredients.length > 0) {
            return defaultIngredients.map(name => {
                const ing = PIZZA_INGREDIENTS.find(i => i.name === name);
                if (ing) {
                    return { ingredient: ing, half: 'full' as PizzaHalf };
                }
                return null;
            }).filter(Boolean) as PizzaIngredientSelection[];
        }
        return [];
    });
    const [quantity, setQuantity] = useState(initialCartItem?.quantity || 1);

    // Calcular precio total
    const totalPrice = useMemo(() => {
        let basePrice = isSpecialPizza ? item.price : PIZZA_BASE_PRICES[size];

        // Sumar ingredientes (si es especial, los ingredientes por defecto no cuestan extra)
        ingredients.forEach(sel => {
            // Si es pizza especial y el ingrediente está en defaultIngredients, no cobra
            if (isSpecialPizza && defaultIngredients.includes(sel.ingredient.name)) {
                return;
            }
            const ingPrice = sel.ingredient.prices[isSpecialPizza ? 'Familiar' : size];
            // Si está en mitad, cobra la mitad del precio
            if (sel.half === 'left' || sel.half === 'right') {
                basePrice += ingPrice / 2;
            } else {
                basePrice += ingPrice;
            }
        });

        return basePrice * quantity;
    }, [size, ingredients, quantity, isSpecialPizza, item.price, defaultIngredients]);

    // Agrupar ingredientes por categoría
    const groupedIngredients = useMemo(() => {
        const grouped: Record<string, PizzaIngredient[]> = { A: [], B: [], C: [] };
        PIZZA_INGREDIENTS.forEach(ing => {
            grouped[ing.category].push(ing);
        });
        return grouped;
    }, []);

    // Verificar si un ingrediente está seleccionado
    const getIngredientSelection = (ingredientName: string): PizzaIngredientSelection | undefined => {
        return ingredients.find(sel => sel.ingredient.name === ingredientName);
    };

    // Agregar/modificar ingrediente
    const toggleIngredient = (ingredient: PizzaIngredient) => {
        const existing = getIngredientSelection(ingredient.name);

        if (existing) {
            // Si existe y el half es el mismo, quitar
            if (existing.half === selectedHalf) {
                setIngredients(prev => prev.filter(sel => sel.ingredient.name !== ingredient.name));
            } else {
                // Cambiar el half
                setIngredients(prev => prev.map(sel =>
                    sel.ingredient.name === ingredient.name
                        ? { ...sel, half: selectedHalf }
                        : sel
                ));
            }
        } else {
            // Agregar nuevo
            setIngredients(prev => [...prev, { ingredient, half: selectedHalf }]);
        }
    };

    // Obtener ingredientes por mitad
    const leftIngredients = ingredients.filter(sel => sel.half === 'left' || sel.half === 'full');
    const rightIngredients = ingredients.filter(sel => sel.half === 'right' || sel.half === 'full');

    // Manejar submit
    const handleSubmit = () => {
        const config: PizzaConfiguration = {
            size: isSpecialPizza ? 'Familiar' : size,
            basePrice: isSpecialPizza ? item.price : PIZZA_BASE_PRICES[size],
            ingredients,
            isSpecialPizza,
            specialPizzaName: isSpecialPizza ? item.name : undefined
        };
        onSubmit(item, config, quantity);
    };

    // Colores por categoría
    const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
        A: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500' },
        B: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500' },
        C: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500' }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
            <div
                className="w-full max-w-lg bg-gradient-to-b from-[#0a3d2c] to-[#051a12] rounded-t-3xl max-h-[95vh] flex flex-col animate-slide-up"
                style={{ boxShadow: '0 -10px 40px rgba(0,212,170,0.3)' }}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            {isSpecialPizza ? item.name : '🍕 Arma tu Pizza'}
                        </h2>
                        <p className="text-sm text-gray-400">{item.description}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Contenido scrolleable */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">

                    {/* Selector de tamaño (solo para pizza personalizada) */}
                    {!isSpecialPizza && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-300 mb-3">📏 Selecciona el Tamaño</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {(['Pequeña', 'Mediana', 'Familiar'] as PizzaSize[]).map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setSize(s)}
                                        className={`p-3 rounded-xl border-2 transition-all ${size === s
                                            ? 'border-[#00D4AA] bg-[#00D4AA]/20 text-white'
                                            : 'border-white/20 bg-white/5 text-gray-400 hover:border-white/40'
                                            }`}
                                    >
                                        <div className="text-lg font-bold">${PIZZA_BASE_PRICES[s]}</div>
                                        <div className="text-xs">{s}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Visualización de la Pizza */}
                    <div className="flex flex-col items-center">
                        <h3 className="text-sm font-semibold text-gray-300 mb-3">🍕 Tu Pizza</h3>

                        {/* Pizza Visual */}
                        <div className="relative w-48 h-48 mb-4">
                            {/* Círculo base de la pizza */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#F4A460] to-[#D2691E] border-4 border-[#8B4513] shadow-lg overflow-hidden">
                                {/* Línea divisoria */}
                                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-[#8B4513]/50 transform -translate-x-1/2" />

                                {/* Mitad izquierda */}
                                <div
                                    className={`absolute top-0 bottom-0 left-0 w-1/2 flex items-center justify-center cursor-pointer transition-all ${selectedHalf === 'left' ? 'bg-[#00D4AA]/30' : 'hover:bg-white/10'
                                        }`}
                                    onClick={() => setSelectedHalf('left')}
                                >
                                    <div className="text-xs text-white/80 font-medium text-center px-1">
                                        {leftIngredients.length > 0 ? (
                                            <div className="space-y-0.5">
                                                {leftIngredients.slice(0, 4).map(sel => (
                                                    <div key={sel.ingredient.name} className="truncate text-[10px]">
                                                        {sel.ingredient.name}
                                                    </div>
                                                ))}
                                                {leftIngredients.length > 4 && (
                                                    <div className="text-[10px]">+{leftIngredients.length - 4} más</div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-white/40">Izq</span>
                                        )}
                                    </div>
                                </div>

                                {/* Mitad derecha */}
                                <div
                                    className={`absolute top-0 bottom-0 right-0 w-1/2 flex items-center justify-center cursor-pointer transition-all ${selectedHalf === 'right' ? 'bg-[#00D4AA]/30' : 'hover:bg-white/10'
                                        }`}
                                    onClick={() => setSelectedHalf('right')}
                                >
                                    <div className="text-xs text-white/80 font-medium text-center px-1">
                                        {rightIngredients.length > 0 ? (
                                            <div className="space-y-0.5">
                                                {rightIngredients.slice(0, 4).map(sel => (
                                                    <div key={sel.ingredient.name} className="truncate text-[10px]">
                                                        {sel.ingredient.name}
                                                    </div>
                                                ))}
                                                {rightIngredients.length > 4 && (
                                                    <div className="text-[10px]">+{rightIngredients.length - 4} más</div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-white/40">Der</span>
                                        )}
                                    </div>
                                </div>

                                {/* Centro clickeable para toda la pizza */}
                                <div
                                    className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full cursor-pointer transition-all flex items-center justify-center ${selectedHalf === 'full'
                                        ? 'bg-[#00D4AA] text-white shadow-lg'
                                        : 'bg-[#8B4513] text-white/70 hover:bg-[#A0522D]'
                                        }`}
                                    onClick={() => setSelectedHalf('full')}
                                >
                                    <span className="text-xs font-bold">TODA</span>
                                </div>
                            </div>
                        </div>

                        {/* Selector de mitad */}
                        <div className="flex gap-2 mb-2">
                            <button
                                onClick={() => setSelectedHalf('left')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedHalf === 'left'
                                    ? 'bg-[#00D4AA] text-white'
                                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                                    }`}
                            >
                                ◐ Mitad Izq
                            </button>
                            <button
                                onClick={() => setSelectedHalf('full')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedHalf === 'full'
                                    ? 'bg-[#00D4AA] text-white'
                                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                                    }`}
                            >
                                ● Toda
                            </button>
                            <button
                                onClick={() => setSelectedHalf('right')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedHalf === 'right'
                                    ? 'bg-[#00D4AA] text-white'
                                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                                    }`}
                            >
                                Mitad Der ◑
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">
                            Selecciona dónde irán los ingredientes
                        </p>
                    </div>

                    {/* Lista de Ingredientes */}
                    <div className="space-y-4">
                        {(Object.entries(groupedIngredients) as [string, PizzaIngredient[]][]).map(([category, ings]) => (
                            <div key={category}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${categoryColors[category].bg} ${categoryColors[category].text}`}>
                                        Categoría {category}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {category === 'A' && `$${isSpecialPizza ? 3 : (size === 'Pequeña' ? 1 : size === 'Mediana' ? 3 : 3)}`}
                                        {category === 'B' && `$${isSpecialPizza ? 1 : (size === 'Pequeña' ? 0.5 : 1)}`}
                                        {category === 'C' && `$${isSpecialPizza ? 4 : (size === 'Pequeña' ? 2 : 4)}`}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {ings.map(ing => {
                                        const selection = getIngredientSelection(ing.name);
                                        const isDefault = isSpecialPizza && defaultIngredients.includes(ing.name);
                                        const isSelected = !!selection;
                                        const price = ing.prices[isSpecialPizza ? 'Familiar' : size];

                                        return (
                                            <button
                                                key={ing.name}
                                                onClick={() => toggleIngredient(ing)}
                                                className={`p-3 rounded-xl border-2 transition-all text-left ${isSelected
                                                    ? `${categoryColors[ing.category].border} ${categoryColors[ing.category].bg}`
                                                    : 'border-white/10 bg-white/5 hover:border-white/30'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                                        {ing.name}
                                                    </span>
                                                    {isSelected && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 text-white">
                                                            {selection.half === 'full' ? '●' : selection.half === 'left' ? '◐' : '◑'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {isDefault ? (
                                                        <span className="text-green-400">✓ Incluido</span>
                                                    ) : (
                                                        `+$${price.toFixed(2)}`
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Cantidad */}
                    <div className="flex items-center justify-center gap-4">
                        <span className="text-gray-400 text-sm">Cantidad:</span>
                        <div className="flex items-center gap-3 bg-white/10 rounded-full px-2 py-1">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                            >
                                −
                            </button>
                            <span className="text-white font-bold text-lg w-8 text-center">{quantity}</span>
                            <button
                                onClick={() => setQuantity(quantity + 1)}
                                className="w-8 h-8 rounded-full bg-[#00D4AA] flex items-center justify-center text-white hover:bg-[#00B894] transition-colors"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer con precio y botón */}
                <div className="p-4 border-t border-white/10 bg-black/30">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <div className="text-gray-400 text-sm">Total</div>
                            <div className="text-2xl font-bold text-[#00D4AA]">
                                ${totalPrice.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                                Bs. {(totalPrice * activeRate).toFixed(2)}
                            </div>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={!isSpecialPizza && ingredients.length === 0}
                            className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all ${(isSpecialPizza || ingredients.length > 0)
                                ? 'bg-gradient-to-r from-[#00D4AA] to-[#00B894] text-white shadow-lg hover:shadow-xl hover:scale-105'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {initialCartItem ? 'Actualizar' : 'Agregar'} 🍕
                        </button>
                    </div>
                </div>
            </div>

            {/* Animación de entrada */}
            <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
        </div>
    );
};

export default PizzaBuilderModal;
