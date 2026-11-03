import { computeScores } from '../../engine/scoring';
import type { GameState } from '../../engine/types';

export function ScoreTable({ state }: { state: GameState }) {
  const rows = computeScores(state);
  return (
    <table className="score">
      <thead>
        <tr>
          <th>Platz</th>
          <th>Name</th>
          <th>Prüfungen</th>
          <th>Rätsel</th>
          <th>Duelle</th>
          <th>Schuldscheine</th>
          <th>Finale</th>
          <th>Bonus</th>
          <th>Dublonen</th>
          <th>Gesamt</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.playerId} className={r.rank === 1 ? 'winner' : ''}>
            <td>{r.rank}.</td>
            <td>{r.name}</td>
            <td>{r.trials}</td>
            <td>{r.riddles}</td>
            <td>{r.duels}</td>
            <td>{r.ious}</td>
            <td>{r.finale}</td>
            <td>{r.bonus}</td>
            <td title={`${r.doubloons} Dublonen`}>{r.doubloonFame}</td>
            <td>
              <strong>{r.total}</strong>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
