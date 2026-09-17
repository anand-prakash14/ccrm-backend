// 2. Third-party
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

// 3. Internal
import { decimalTransformer } from '@/entities/transformers/decimal.transformer';
import { Lead } from '@/entities/Lead.entity';

export enum ConclusionOutcome {
  WON = 'Won',
  LOST = 'Lost',
  ON_HOLD = 'On-hold',
}

export enum LostReason {
  BUDGET = 'Budget',
  LOCATION = 'Location',
  FINANCING = 'Financing',
  CHOSE_COMPETITOR = 'Chose Competitor',
  NOT_INTERESTED = 'Not Interested',
  TIMING = 'Timing',
}

/**
 * The final outcome recorded when a lead reaches the Conclusion stage — at
 * most one per lead (enforced by the UNIQUE constraint on lead_id). Won- and
 * Lost-specific fields stay nullable at the DB level; the application layer
 * (Conclusion service, see later stories) enforces them as required per
 * outcome, matching the HLD's "application-enforced" annotation.
 */
@Entity('conclusion')
export class Conclusion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'lead_id', type: 'uuid', unique: true })
  leadId!: string;

  @OneToOne(() => Lead, (lead) => lead.conclusion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead!: Lead;

  @Column({ name: 'outcome', type: 'enum', enum: ConclusionOutcome })
  outcome!: ConclusionOutcome;

  @Column({ name: 'unit_booked', type: 'varchar', length: 255, nullable: true })
  unitBooked!: string | null;

  @Column({
    name: 'booking_token_amount',
    type: 'numeric',
    precision: 19,
    scale: 4,
    nullable: true,
    transformer: decimalTransformer,
  })
  bookingTokenAmount!: number | null;

  @Column({
    name: 'sale_price',
    type: 'numeric',
    precision: 19,
    scale: 4,
    nullable: true,
    transformer: decimalTransformer,
  })
  salePrice!: number | null;

  @Column({ name: 'booking_date', type: 'date', nullable: true })
  bookingDate!: string | null;

  @Column({ name: 'lost_reason', type: 'enum', enum: LostReason, nullable: true })
  lostReason!: LostReason | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
