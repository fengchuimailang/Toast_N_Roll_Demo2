/**
 * 顾客系统
 * 管理固定顾客池、前台顾客展示和回合制耐心结算
 */

import type { Customer, CustomerDemand, FlavorType } from '../types';
import { GIFT_VALUES } from '../types';
import { randomCustomerAvatar, randomPick, generateId } from '../types';

const MAX_VISIBLE_CUSTOMERS = 3;

interface CustomerSystemConfig {
  totalCount: number;
  basePatience: number;
  queuePatienceOffset: number;
  entryGraceTurns: number;
  demandCountRange: [number, number];
  allowedFlavors: FlavorType[];
}

const DEFAULT_CONFIG: CustomerSystemConfig = {
  totalCount: 3,
  basePatience: 30,
  queuePatienceOffset: 20,
  entryGraceTurns: 1,
  demandCountRange: [1, 2],
  allowedFlavors: ['original', 'matcha', 'strawberry'],
};

type RuntimeCustomer = Customer & {
  graceTurnsRemaining: number;
  queueIndex: number;
};

export class CustomerSystem {
  private activeCustomers: RuntimeCustomer[] = [];
  private pendingCustomers: RuntimeCustomer[] = [];
  private onCustomerServed?: (customer: Customer) => void;
  private onCustomerLeft?: (customer: Customer) => void;
  private config: CustomerSystemConfig = { ...DEFAULT_CONFIG };
  private servedCustomers: number = 0;
  private missedCustomers: number = 0;

  constructor(
    onCustomerServed?: (customer: Customer) => void,
    onCustomerLeft?: (customer: Customer) => void
  ) {
    this.onCustomerServed = onCustomerServed;
    this.onCustomerLeft = onCustomerLeft;
    this.reset();
  }

  private createCustomer(queueIndex: number): RuntimeCustomer {
    const demandCount = this.getRandomDemandCount();
    const demand: CustomerDemand = {
      type: randomPick(this.config.allowedFlavors),
      count: demandCount,
    };

    const baseReward = GIFT_VALUES[demand.type] * demand.count;
    const maxPatience = this.config.basePatience + this.config.queuePatienceOffset * queueIndex;

    return {
      id: generateId(),
      avatar: randomCustomerAvatar(),
      demand,
      patience: maxPatience,
      maxPatience,
      reward: baseReward,
      graceTurnsRemaining: 0,
      queueIndex,
    };
  }

  private getRandomDemandCount(): number {
    const [minDemand, maxDemand] = this.config.demandCountRange;
    const min = Math.max(1, Math.floor(minDemand));
    const max = Math.max(min, Math.floor(maxDemand));
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private seedCustomers(): void {
    this.activeCustomers = [];
    this.pendingCustomers = [];

    for (let index = 0; index < this.config.totalCount; index++) {
      this.pendingCustomers.push(this.createCustomer(index));
    }

    this.refillActiveCustomers(false);
  }

  private refillActiveCustomers(applyGrace: boolean): void {
    while (this.activeCustomers.length < MAX_VISIBLE_CUSTOMERS && this.pendingCustomers.length > 0) {
      const nextCustomer = this.pendingCustomers.shift()!;
      nextCustomer.graceTurnsRemaining = applyGrace ? this.config.entryGraceTurns : 0;
      this.activeCustomers.push(nextCustomer);
    }
  }

  configureLevel(config: {
    totalCount: number;
    basePatience: number;
    queuePatienceOffset: number;
    entryGraceTurns: number;
    demandCountRange: [number, number];
    allowedFlavors?: FlavorType[];
  }): void {
    this.config = {
      totalCount: Math.max(1, Math.floor(config.totalCount)),
      basePatience: Math.max(1, Math.floor(config.basePatience)),
      queuePatienceOffset: Math.max(0, Math.floor(config.queuePatienceOffset)),
      entryGraceTurns: Math.max(0, Math.floor(config.entryGraceTurns)),
      demandCountRange: config.demandCountRange,
      allowedFlavors: config.allowedFlavors && config.allowedFlavors.length > 0
        ? config.allowedFlavors
        : DEFAULT_CONFIG.allowedFlavors,
    };
    this.reset();
  }

  getCustomers(): Customer[] {
    return this.activeCustomers;
  }

  getCurrentCustomer(): Customer | null {
    return this.activeCustomers.length > 0 ? this.activeCustomers[0] : null;
  }

  hasDemandForFlavor(flavor: FlavorType): boolean {
    return this.activeCustomers.some(c => c.demand.type === flavor && c.demand.count > 0);
  }

  getCustomerForFlavor(flavor: FlavorType): Customer | null {
    return this.activeCustomers.find(c => c.demand.type === flavor && c.demand.count > 0) || null;
  }

  serveCustomer(customerId: string): boolean {
    const customer = this.activeCustomers.find(c => c.id === customerId);
    if (!customer) return false;

    customer.demand.count--;

    if (customer.demand.count <= 0) {
      this.completeCustomer(customerId);
      return true;
    }

    return false;
  }

  completeCustomer(customerId: string): Customer | null {
    const index = this.activeCustomers.findIndex(c => c.id === customerId);
    if (index < 0) return null;

    const [customer] = this.activeCustomers.splice(index, 1);
    this.servedCustomers++;
    this.onCustomerServed?.(customer);
    this.refillActiveCustomers(true);
    return customer;
  }

  consumeTurn(): void {
    const customersLeaving: RuntimeCustomer[] = [];

    this.activeCustomers.forEach((customer) => {
      if (customer.graceTurnsRemaining > 0) {
        customer.graceTurnsRemaining--;
        return;
      }

      customer.patience = Math.max(0, customer.patience - 1);
      if (customer.patience <= 0) {
        customersLeaving.push(customer);
      }
    });

    if (customersLeaving.length === 0) {
      return;
    }

    const leavingIds = new Set(customersLeaving.map(customer => customer.id));
    this.activeCustomers = this.activeCustomers.filter(customer => !leavingIds.has(customer.id));
    this.missedCustomers += customersLeaving.length;
    customersLeaving.forEach((customer) => this.onCustomerLeft?.(customer));
    this.refillActiveCustomers(true);
  }

  getPatiencePercent(customer: Customer): number {
    return Math.max(0, customer.patience / customer.maxPatience);
  }

  getRemainingCustomersToServe(): number {
    return this.activeCustomers.length + this.pendingCustomers.length;
  }

  getServedCustomersCount(): number {
    return this.servedCustomers;
  }

  getMissedCustomersCount(): number {
    return this.missedCustomers;
  }

  getTotalCustomersCount(): number {
    return this.config.totalCount;
  }

  reset(): void {
    this.servedCustomers = 0;
    this.missedCustomers = 0;
    this.seedCustomers();
  }
}
