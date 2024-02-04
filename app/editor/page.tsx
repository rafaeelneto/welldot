import PerfilEditor from '@/app/editor/profileEditor.component';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Well Profiler | Editor',
  description:
    'Crie, planeje, edite e exporte o perfil geológico construtivo do seu poço',
};

function Page() {
  return <PerfilEditor />;
}

export default Page;
