import type { TargetVersion } from "../types";

export function TargetVersionHistory({ versions }: { versions: TargetVersion[] }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <h3 className="font-semibold mb-3">목표값 수정 이력</h3>
      <div className="space-y-2 text-sm">
        {versions.length === 0 ? <p className="text-muted-foreground">수정 이력이 없습니다.</p> : versions.map((item) => (
          <div key={item.id} className="border-b pb-2 last:border-b-0">
            <p className="font-medium">{item.version} · {item.changed_at}</p>
            <p className="text-muted-foreground">{item.change_reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
