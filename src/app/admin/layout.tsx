import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { isAdminAuthed } from '@/app/utils/adminAuth';
import AdminConfigWrapper from '@/app/components/admin/AdminConfigWrapper';

export default async function AdminLayout({ children }: { children: ReactNode }) {
    // Protection admin : redirige vers /connexion tant que le cookie
    // de session n'est pas valide (inactif si ADMIN_PASSWORD est absent).
    if (!isAdminAuthed()) redirect('/connexion');

    return <AdminConfigWrapper>{children}</AdminConfigWrapper>;
}
