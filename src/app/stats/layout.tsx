import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { isAdminAuthed } from '@/app/utils/adminAuth';
import AdminConfigWrapper from '@/app/components/admin/AdminConfigWrapper';

export default async function StatsLayout({ children }: { children: ReactNode }) {
    // Protection stats : inactif si ADMIN_PASSWORD est absent.
    if (!(await isAdminAuthed())) redirect('/connexion');

    return <AdminConfigWrapper>{children}</AdminConfigWrapper>;
}
