import { describe, expect, it } from 'vitest';
import { isOpen, isTicketStatus, nextStatuses } from '@/domain/tickets/status';

describe('nextStatuses', () => {
  it('open can progress or close', () => {
    expect(nextStatuses('open')).toEqual(['in_progress', 'closed']);
  });
  it('in_progress can only close', () => {
    expect(nextStatuses('in_progress')).toEqual(['closed']);
  });
  it('closed can reopen', () => {
    expect(nextStatuses('closed')).toEqual(['open']);
  });
});

describe('isOpen', () => {
  it('is true unless closed', () => {
    expect(isOpen('open')).toBe(true);
    expect(isOpen('in_progress')).toBe(true);
    expect(isOpen('closed')).toBe(false);
  });
});

describe('isTicketStatus', () => {
  it('validates known statuses only', () => {
    expect(isTicketStatus('open')).toBe(true);
    expect(isTicketStatus('nonsense')).toBe(false);
  });
});
