import type { Metadata } from 'next';

import PerfilEditor from '@/views/ProfileEditor/ProfileEditor.component';

export const metadata: Metadata = {
  title: 'Well Profiler | Editor',
  description:
    'Crie, planeje, edite e exporte o perfil geológico construtivo do seu poço',
};

function Page() {
  return <PerfilEditor />;
}

export default Page;
