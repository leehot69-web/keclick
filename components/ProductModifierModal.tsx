import React, { useState, useMemo } from 'react';
import { MenuItem, ModifierOption, ModifierGroup, CartItem, SelectedModifier, ModifierAssignment } from '../types';

interface ProductModifierModalProps {
    item: MenuItem;
    allModifierGroups: ModifierGroup[];
    onClose: () => void;
    onSubmit: (item: MenuItem, selectedModifiers: SelectedModifier[], quantity: number) => void;
    initialCartItem?: CartItem | null;
    activeRate: number;
}

const getGroupAndLabel = (assignment: string | ModifierAssignment): { groupTitle: string, displayLabel: string } => {
    if (typeof assignment === 'string') {
        return { groupTitle: assignment, displayLabel: assignment };
    }
    return { groupTitle: assignment.group, displayLabel: assignment.label };
};

const ProductModifierModal: React.FC<ProductModifierModalProps> = ({ item, allModifierGroups, onClose, onSubmit, initialCartItem, activeRate }) => {
    const [quantity, setQuantity] = useState(initialCartItem?.quantity || 1);
    const [localNotes, setLocalNotes] = useState(initialCartItem?.notes || '');

    const groupsToDisplay = useMemo(() => {
        if (!item.modifierGroupTitles) return [];
        return item.modifierGroupTitles.map(assignment => {
            const { groupTitle, displayLabel } = getGroupAndLabel(assignment);
            const groupData = allModifierGroups.find(g => g.title === groupTitle);
            return groupData ? { ...groupData, displayLabel } : null;
        }).filter(Boolean) as (ModifierGroup & { displayLabel: string })[];
    }, [item.modifierGroupTitles, allModifierGroups]);

    const [selectionsByGroup, setSelectionsByGroup] = useState<Record<string, ModifierOption[]>>(() => {
        const initialState: Record<string, ModifierOption[]> = {};
        groupsToDisplay.forEach(group => {
            initialState[group.displayLabel] = [];
        });
        if (initialCartItem) {
            initialCartItem.selectedModifiers.forEach(selectedMod => {
                if (initialState[selectedMod.groupTitle]) {
                    const groupDef = groupsToDisplay.find(g => g.displayLabel === selectedMod.groupTitle);
                    const originalOption = groupDef?.options.find(opt => opt.name === selectedMod.option.name);
                    if (originalOption) {
                        initialState[selectedMod.groupTitle].push(originalOption);
                    }
                }
            });
        }
        return initialState;
    });

    const handleAddOption = (group: ModifierGroup & { displayLabel: string }, option: ModifierOption) => {
        setSelectionsByGroup(prev => {
            const newSelections = { ...prev };
            const currentGroupSelections = prev[group.displayLabel] || [];
            if (currentGroupSelections.length < group.maxSelection) {
                newSelections[group.displayLabel] = [...currentGroupSelections, option];
            }
            return newSelections;
        });
    };

    const handleRemoveOption = (group: ModifierGroup & { displayLabel: string }, option: ModifierOption) => {
        setSelectionsByGroup(prev => {
            const newSelections = { ...prev };
            const currentGroupSelections = [...(prev[group.displayLabel] || [])];
            const lastIndex = currentGroupSelections.map(o => o.name).lastIndexOf(option.name);
            if (lastIndex !== -1) {
                const newGroupSelections = [...currentGroupSelections];
                newGroupSelections.splice(lastIndex, 1);
                newSelections[group.displayLabel] = newGroupSelections;
            }
            return newSelections;
        });
    };

    const handleSelectionChange = (group: ModifierGroup & { displayLabel: string }, option: ModifierOption) => {
        setSelectionsByGroup(prev => {
            const newSelections = { ...prev };
            let currentGroupSelections = [...(newSelections[group.displayLabel] || [])];
            const isSelected = currentGroupSelections.some(mod => mod.name === option.name);
            if (group.selectionType === 'single') {
                currentGroupSelections = isSelected ? [] : [option];
            } else {
                if (isSelected) {
                    currentGroupSelections = currentGroupSelections.filter(mod => mod.name !== option.name);
                } else if (currentGroupSelections.length < group.maxSelection) {
                    currentGroupSelections.push(option);
                }
            }
            newSelections[group.displayLabel] = currentGroupSelections;
            return newSelections;
        });
    };

    const validationStatus = useMemo(() => {
        let isValid = true;
        const errors: Record<string, string> = {};
        groupsToDisplay.forEach(group => {
            const selectionCount = selectionsByGroup[group.displayLabel]?.length || 0;
            if (selectionCount < group.minSelection) {
                isValid = false;
                errors[group.displayLabel] = `Selecciona al menos ${group.minSelection}`;
            }
        });
        return { isValid, errors };
    }, [selectionsByGroup, groupsToDisplay]);

    const calculateTotal = () => {
        let modifiersTotal = 0;
        Object.entries(selectionsByGroup).forEach(([displayLabel, selectedOptions]: [string, ModifierOption[]]) => {
            const groupDef = groupsToDisplay.find(g => g.displayLabel === displayLabel);
            if (!groupDef) return;
            if (groupDef.freeSelectionCount !== undefined && groupDef.extraPrice !== undefined) {
                const freeLimit = groupDef.freeSelectionCount;
                const extraCost = groupDef.extraPrice;
                const baseOptionsCost = selectedOptions.reduce((sum, opt) => sum + opt.price, 0);
                const count = selectedOptions.length;
                const extras = Math.max(0, count - freeLimit);
                modifiersTotal += baseOptionsCost + (extras * extraCost);
            } else {
                modifiersTotal += selectedOptions.reduce((sum, opt) => sum + opt.price, 0);
            }
        });
        return (item.price + modifiersTotal) * quantity;
    };

    const handleSubmit = () => {
        if (!validationStatus.isValid) return;
        const finalModifiers: SelectedModifier[] = [];
        Object.entries(selectionsByGroup).forEach(([displayLabel, selectedOptions]: [string, ModifierOption[]]) => {
            const groupDef = groupsToDisplay.find(g => g.displayLabel === displayLabel);
            if (groupDef && groupDef.freeSelectionCount !== undefined && groupDef.extraPrice !== undefined) {
                const freeLimit = groupDef.freeSelectionCount;
                const extraCost = groupDef.extraPrice;
                selectedOptions.forEach((opt, index) => {
                    const finalOption = index < freeLimit ? opt : { ...opt, price: extraCost };
                    finalModifiers.push({ groupTitle: displayLabel, option: finalOption });
                });
            } else {
                selectedOptions.forEach(opt => {
                    finalModifiers.push({ groupTitle: displayLabel, option: opt });
                });
            }
        });
        const itemWithNotes = { ...item, notes: localNotes } as any;
        onSubmit(itemWithNotes, finalModifiers, quantity);
    };

    const incrementQty = () => setQuantity(q => q + 1);
    const decrementQty = () => setQuantity(q => (q > 1 ? q - 1 : 1));

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-[#121212]/90 sm:rounded-[2.5rem] rounded-t-[2.5rem] border border-white/10 w-full max-w-md max-h-[92vh] flex flex-col transform transition-transform overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]" onClick={e => e.stopPropagation()}>
                {/* Header Decoration */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[--brand-color] to-transparent opacity-50"></div>

                <div className="w-12 h-1 bg-white/10 rounded-full mx-auto my-4 sm:hidden shrink-0"></div>

                <div className="px-8 pt-6 pb-4 flex justify-between items-start shrink-0">
                    <div className="relative group">
                        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-[--brand-color] rounded-full scale-y-0 group-hover:scale-y-100 transition-transform"></div>
                        <h2 className="text-2xl font-light text-white tracking-tight leading-none">
                            <span className="font-semibold block">{item.name}</span>
                        </h2>
                        <div className="flex items-center gap-2 mt-3 overflow-hidden">
                            <span className="h-px w-4 bg-[--accent-color]/30"></span>
                            <p className="text-[--accent-color] text-[10px] font-medium uppercase tracking-[0.25em] whitespace-nowrap opacity-80">Custom Order</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-95">
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto px-8 pb-8 space-y-10 scrollbar-hide">
                    {item.description && (
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-[--brand-color]/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <p className="relative text-white/40 text-[11px] leading-relaxed font-normal p-5 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm italic">
                                "{item.description}"
                            </p>
                        </div>
                    )}

                    {groupsToDisplay.map(group => (
                        <section key={group.displayLabel} className="relative">
                            <div className="flex justify-between items-end mb-5 px-1">
                                <div>
                                    <h4 className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.3em] leading-none mb-1">{group.displayLabel}</h4>
                                    <div className="h-0.5 w-6 bg-[--accent-color]/20 rounded-full"></div>
                                </div>
                                {group.minSelection > 0 ? (
                                    <span className="text-[8px] px-2 py-1 rounded-md bg-[--brand-color]/10 text-[--brand-color] font-bold uppercase tracking-widest border border-[--brand-color]/20">Required</span>
                                ) : (
                                    <span className="text-[8px] px-2 py-1 rounded-md bg-white/5 text-white/30 font-bold uppercase tracking-widest border border-white/5">Optional</span>
                                )}
                            </div>

                            {group.selectionType === 'single' ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {group.options.map(option => {
                                        const isSelected = selectionsByGroup[group.displayLabel]?.some(o => o.name === option.name);
                                        return (
                                            <button
                                                key={option.name}
                                                onClick={() => handleSelectionChange(group, option)}
                                                className={`relative py-5 px-4 rounded-2xl border transition-all flex flex-col gap-2 items-start group overflow-hidden ${isSelected
                                                    ? 'border-[--brand-color]/50 bg-[--brand-color]/5 text-white shadow-[0_0_20px_rgba(220,20,60,0.15)] scale-[1.02]'
                                                    : 'border-white/5 bg-white/[0.03] text-white/40 hover:border-white/20 hover:bg-white/[0.05]'
                                                    }`}
                                            >
                                                {isSelected && <div className="absolute top-0 right-0 p-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[--brand-color] animate-pulse"></div></div>}
                                                <span className={`text-[13px] font-medium transition-colors ${isSelected ? 'text-white' : 'group-hover:text-white/70'}`}>{option.name}</span>
                                                <span className={`text-[10px] font-light tracking-wide ${isSelected ? 'text-[--brand-color]' : 'text-white/20'}`}>
                                                    {option.price > 0 ? `+$${option.price.toFixed(2)}` : 'Included'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {group.options.map(option => {
                                        const selectedCount = selectionsByGroup[group.displayLabel]?.filter(o => o.name === option.name).length || 0;
                                        const isChecked = selectedCount > 0;
                                        const allowDuplicates = group.title.toLowerCase().includes('proteína') || group.title.toLowerCase().includes('extra');

                                        return (
                                            <div key={option.name} className={`relative group flex items-center justify-between p-5 rounded-3xl border transition-all ${isChecked ? 'bg-white/[0.05] border-white/20 shadow-lg' : 'bg-white/[0.02] border-white/5'}`}>
                                                <div className="flex flex-col gap-1">
                                                    <span className={`text-sm font-medium transition-colors ${isChecked ? 'text-white' : 'text-white/60 group-hover:text-white/80'}`}>{option.name}</span>
                                                    <span className={`text-[10px] font-light ${isChecked ? 'text-[--brand-color]' : 'text-white/20'}`}>
                                                        {option.price > 0 ? `+$${option.price.toFixed(2)}` : 'No additional cost'}
                                                    </span>
                                                </div>

                                                {allowDuplicates ? (
                                                    <div className="flex items-center gap-4 bg-black/20 p-1.5 rounded-2xl border border-white/5">
                                                        {isChecked && (
                                                            <button onClick={() => handleRemoveOption(group, option)} className="w-9 h-9 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 text-white/40 hover:text-white transition-all active:scale-90">
                                                                <span className="material-symbols-outlined text-lg">remove</span>
                                                            </button>
                                                        )}
                                                        {isChecked && <span className="font-light text-white text-base w-4 text-center">{selectedCount}</span>}
                                                        <button onClick={() => handleAddOption(group, option)} className="w-9 h-9 flex items-center justify-center bg-[--red-gradient] rounded-xl text-white shadow-lg shadow-crimson/20 transition-all active:scale-90">
                                                            <span className="material-symbols-outlined text-lg">add</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => handleSelectionChange(group, option)} className={`h-11 w-11 rounded-2xl border flex items-center justify-center transition-all ${isChecked
                                                        ? 'bg-[--red-gradient] border-transparent shadow-lg shadow-crimson/20 scale-105'
                                                        : 'bg-white/5 border-white/10 text-white/20 hover:border-white/30'}`}>
                                                        <span className={`material-symbols-outlined text-xl ${isChecked ? 'text-white scale-110' : 'opacity-0'}`}>check</span>
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    ))}

                    <section className="relative">
                        <div className="flex items-center gap-3 mb-4 px-1">
                            <span className="material-symbols-outlined text-white/20 text-lg">edit_note</span>
                            <h4 className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.3em] leading-none">Kitchen Instructions</h4>
                        </div>
                        <textarea
                            value={localNotes}
                            onChange={e => setLocalNotes(e.target.value)}
                            className="w-full bg-white/[0.02] border border-white/5 rounded-3xl p-6 text-[13px] text-white/80 placeholder-white/10 focus:border-[--brand-color]/30 focus:bg-white/[0.04] outline-none resize-none transition-all font-light min-h-[120px]"
                            placeholder="Ex: No onions, well done please..."
                            rows={3}
                        />
                    </section>
                </div>

                <div className="p-8 pb-10 border-t border-white/5 bg-[#121212]/95 backdrop-blur-2xl flex flex-col gap-6 relative">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                    <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-5 bg-white/[0.03] p-1.5 rounded-[20px] border border-white/5">
                            <button onClick={decrementQty} className="w-11 h-11 flex items-center justify-center bg-white/5 rounded-[14px] text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90">
                                <span className="material-symbols-outlined text-lg">remove</span>
                            </button>
                            <span className="w-4 text-center text-white font-light text-xl">{quantity}</span>
                            <button onClick={incrementQty} className="w-11 h-11 flex items-center justify-center bg-white/5 rounded-[14px] text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90">
                                <span className="material-symbols-outlined text-lg">add</span>
                            </button>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-semibold text-white/20 uppercase tracking-[0.25em] mb-2 leading-none">Total Amount</p>
                            <div className="flex items-baseline gap-1 justify-end">
                                <span className="text-white/30 text-xs font-light tracking-wider">$</span>
                                <p className="text-3xl font-light text-white leading-none tracking-tight">
                                    <span className="font-semibold">{Math.floor(calculateTotal())}</span>
                                    <span className="text-xl opacity-40">.{((calculateTotal() % 1) * 100).toFixed(0).padStart(2, '0')}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!validationStatus.isValid}
                        className={`group relative w-full py-5 rounded-[22px] font-semibold text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all active:scale-[0.97] overflow-hidden ${validationStatus.isValid
                            ? 'text-white'
                            : 'bg-white/5 text-white/10 cursor-not-allowed border border-white/5'
                            }`}
                    >
                        {validationStatus.isValid && (
                            <>
                                <div className="absolute inset-0 bg-[--red-gradient] transition-transform group-hover:scale-110"></div>
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="relative flex items-center justify-center gap-3">
                                    <span>Confirm Selection</span>
                                    <span className="material-symbols-outlined text-lg">keyboard_double_arrow_right</span>
                                </div>
                                <div className="absolute inset-0 shadow-[0_0_30px_rgba(220,20,60,0.5)] opacity-50"></div>
                            </>
                        )}
                        {!validationStatus.isValid && <span>Select Requirements</span>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductModifierModal;
