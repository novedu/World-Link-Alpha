import TimelineSection from '../TimelineSection';

export function TimelineTabSection({
  currentWorld,
  editingEntity,
  entitiesInWorld,
  onEntityFieldChange,
  relationOptions,
  relationLabels
}) {
  return (
    <div className="section-card fade-in">
      <TimelineSection
        currentWorld={currentWorld}
        currentEntity={editingEntity}
        entitiesInWorld={entitiesInWorld}
        onChangeField={onEntityFieldChange}
        relationOptions={relationOptions}
        relationLabels={relationLabels}
      />
    </div>
  );
}
