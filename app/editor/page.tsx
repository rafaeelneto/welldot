import type { Metadata } from 'next';
import { Suspense } from 'react';

import PerfilEditor from '@/src/views/ProfileEditor/ProfileEditor.component';

export const metadata: Metadata = {
  title: 'Well Profiler | Editor',
  description:
    'Crie, planeje, edite e exporte o perfil geológico construtivo do seu poço',
};

function Page() {
  return (
    <Suspense>
      <PerfilEditor />
    </Suspense>
  );
}

export default Page;
