import { HouseholdSwitcher } from './HouseholdSettings/HouseholdSwitcher';
import { CurrencyManager } from './HouseholdSettings/CurrencyManager';
import { CategoryManager } from './HouseholdSettings/CategoryManager';
import { ShopManager } from './HouseholdSettings/ShopManager';
import { UnitManager } from './HouseholdSettings/UnitManager';
import { StatusManager } from './HouseholdSettings/StatusManager';
import type { SharedSettingsProps } from './types';

export const HouseholdSection = ({ config, isOwner, setDeleteConfig }: SharedSettingsProps) => {
    return (
        <>
            <HouseholdSwitcher config={config} />

            {isOwner && (
                <section className="space-y-4 pt-4">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-4">Household Settings</h2>
                    <div className="grid gap-4">
                        <CurrencyManager config={config} />
                        <CategoryManager config={config} setDeleteConfig={setDeleteConfig} />
                        <ShopManager config={config} setDeleteConfig={setDeleteConfig} />
                        <UnitManager config={config} setDeleteConfig={setDeleteConfig} />
                        <StatusManager config={config} setDeleteConfig={setDeleteConfig} />
                    </div>
                </section>
            )}
        </>
    );
};
