import React from 'react'
import { render, screen } from '@testing-library/react'

// Small test component that mirrors the inventory stat rendering logic
function StatPanel({ member }){
  const value = (member && member.stats && typeof member.stats.atk === 'number') ? member.stats.atk : 0;
  let weaponPercent = 0;
  if (member && Array.isArray(member.inventory)){
    const equippedWeapons = member.inventory.filter(i => i && i.type === 'weapon' && (i.equippedSlot === 'right' || i.equippedSlot === 'left' || i.equippedBy === member.id));
    if (equippedWeapons.length){
      weaponPercent = equippedWeapons.reduce((acc, w) => acc + (typeof w.damage === 'number' ? w.damage : 0), 0);
    }
  }
  return (
    <div>
      <div className="stat-line">
        <span className="stat-name">attack</span>
        <span className="stat-value">
          {weaponPercent > 0 && <span className="stat-percent">{`+${weaponPercent}%`}</span>}
          <span>{value}</span>
        </span>
      </div>
    </div>
  )
}

test('renders weapon percent when equipped', () => {
  const member = {
    stats: { atk: 10 },
    inventory: [ { type: 'weapon', damage: 50, equippedSlot: 'right', name: 'spear' } ]
  }
  render(<StatPanel member={member} />)
  expect(screen.getByText('+50%')).toBeInTheDocument()
  expect(screen.getByText('10')).toBeInTheDocument()
})
