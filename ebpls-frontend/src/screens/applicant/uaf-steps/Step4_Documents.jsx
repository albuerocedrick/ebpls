import { useState } from 'react';
import DocumentUploadPanel from '../../../components/shared/DocumentUploadPanel';
import useApplicationStore from '../../../store/applicationStore';
import { documentFiles, getFormBranches, requirementKey } from '../../../utils/uafForm';

export default function Step4_Documents({ docFeedback, requirements, loading, error }) {
  const form = useApplicationStore(state => state.formData);
  const update = useApplicationStore(state => state.setFormField);
  const [uploading, setUploading] = useState(0);
  const groups = [
    { branch_key: null, branch_name: 'Business documents' },
    ...getFormBranches(form),
  ];
  const documents = form.step4.documents;

  function saveFiles(requirement, files) {
    const { documents: current } = useApplicationStore.getState().formData.step4;
    const remaining = current.filter(doc => {
      if (Number(doc.requirement_id) !== requirement.id) return true;
      if (doc.branch_key === requirement.branch_key) return false;
      return !(doc.branch_key === undefined && (requirement.branch_key == null || requirement.branch_key === 'main'));
    });
    if (files.length) remaining.push({ requirement_id: requirement.id, branch_key: requirement.branch_key, files });
    update('step4', 'documents', remaining);
  }

  if (loading) return <p className="text-sm text-zinc-600">Loading document requirements…</p>;
  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  return <div className="space-y-5">
    <p className="text-sm text-zinc-600">Upload PDF, JPG or PNG files up to 5 MB each. Use a separate file for each branch requirement.</p>
    {groups.map(group => {
      const scoped = requirements.filter(requirement => requirement.branch_key === group.branch_key);
      if (!scoped.length) return null;
      return <section key={group.branch_key ?? 'business'} className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-900">{group.branch_name}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {scoped.map(requirement => {
            const feedback = docFeedback?.find(item => item.requirement === requirement.name);
            const files = documentFiles(documents, requirement);
            return <DocumentUploadPanel
              key={requirementKey(requirement)}
              title={requirement.name}
              description={requirement.condition_description || requirement.description}
              value={files.length ? files : null}
              maxFiles={requirement.max_files}
              disabled={uploading > 0}
              feedback={feedback && (feedback.remarks || 'Marked for correction')}
              onChange={files => saveFiles(requirement, Array.isArray(files) ? files : [files])}
              onRemove={() => saveFiles(requirement, [])}
              onUploadStart={() => setUploading(count => count + 1)}
              onUploadEnd={() => setUploading(count => Math.max(0, count - 1))}
            />;
          })}
        </div>
      </section>;
    })}
  </div>;
}
