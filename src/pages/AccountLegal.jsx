import React from 'react';
import LegalEntityManager from '../components/profile/LegalEntityManager';

export default function AccountLegalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#C31E2E] to-[#940815] bg-clip-text text-transparent">
            Юридические лица
          </h1>
          <p className="text-slate-600 mt-1">Управление вашими организациями</p>
        </div>

        <LegalEntityManager />
      </div>
    </div>
  );
}