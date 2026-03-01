import type { UserConfig } from '../../types';

export interface DeleteConfig {
    type: 'Category' | 'Shop' | 'Unit' | 'Status' | 'Member';
    id: string;
    name?: string;
}

export interface SharedSettingsProps {
    config: UserConfig | null;
    isOwner: boolean;
    setDeleteConfig: (config: DeleteConfig) => void;
}
