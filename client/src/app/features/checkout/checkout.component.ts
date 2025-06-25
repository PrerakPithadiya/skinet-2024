import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { OrderSummaryComponent } from "../../shared/components/order-summary/order-summary.component";
import {MatStepper, MatStepperModule} from '@angular/material/stepper';
import { MatButton } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { SnackbarService } from '../../core/services/snackbar.service';
import {MatCheckboxChange, MatCheckboxModule} from '@angular/material/checkbox';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { Address } from '../../shared/models/user';
import { firstValueFrom } from 'rxjs';
import { AccountService } from '../../core/services/account.service';
import { CheckoutDeliveryComponent } from "./checkout-delivery/checkout-delivery.component";
import { CheckoutReviewComponent } from "./checkout-review/checkout-review.component";
import { CartService } from '../../core/services/cart.service';
import { CurrencyPipe, JsonPipe } from '@angular/common';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import { OrderToCreate, ShippingAddress } from '../../shared/models/order';
import { OrderService } from '../../core/services/order.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    OrderSummaryComponent,
    MatStepperModule,
    MatButton,
    RouterLink,
    MatCheckboxModule,
    CheckoutDeliveryComponent,
    CheckoutReviewComponent,
    CurrencyPipe,
    JsonPipe,
    MatProgressSpinnerModule
],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent implements OnInit, OnDestroy {
  private snackbar = inject(SnackbarService);
  private router = inject(Router);
  private accountService = inject(AccountService);
  private orderService = inject(OrderService);
  cartService = inject(CartService);
  saveAddress = false;
  completionStatus = signal<{address: boolean, delivery: boolean}>(
    {address: false, delivery: false}
  );
  loading = false;

  async ngOnInit() {
    // Skip payment element initialization
  }

  handleAddressChange = (event: any) => {
    this.completionStatus.update(state => {
      state.address = event.complete;
      return state;
    })
  }

  handleDeliveryChange(event: boolean) {
    this.completionStatus.update(state => {
      state.delivery = event;
      return state;
    })
  }

  async getConfirmationToken() {
    // Removed payment confirmation token logic
  }

  async onStepChange(event: StepperSelectionEvent) {
    if (event.selectedIndex === 1) {
      if (this.saveAddress) {
        const address = await this.getAddressFromStripeAddress() as Address;
        address && firstValueFrom(this.accountService.updateAddress(address));
      }
    }
    // No payment intent step
    if (event.selectedIndex === 2) {
      // Directly allow confirmation
    }
  }

  async confirmOrder(stepper: MatStepper) {
    this.loading = true;
    try {
      const order = await this.createOrderModel();
      const orderResult = await firstValueFrom(this.orderService.createOrder(order));
      if (orderResult !== undefined && orderResult !== null) {
        this.orderService.orderComplete = true;
        this.cartService.deleteCart();
        this.cartService.selectedDelivery.set(null);
        this.router.navigateByUrl('/checkout/success');
      } else {
        throw new Error('Order creation failed');
      }
    } catch (error: unknown) {
      let errorMessage = 'Something went wrong';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = JSON.stringify(error);
      }
      this.snackbar.error(errorMessage);
      stepper.previous();
    } finally {
      this.loading = false;
    }
  }

  private async createOrderModel(): Promise<OrderToCreate> {
    const cart = this.cartService.cart();
    const shippingAddress = await this.getAddressFromStripeAddress() as ShippingAddress;
    if (!cart?.id || !cart.deliveryMethodId || !shippingAddress) {
      throw new Error('Problem creating order');
    }
    return {
      cartId: cart.id,
      deliveryMethodId: cart.deliveryMethodId,
      shippingAddress,
      paymentSummary: {
        last4: 0,
        brand: 'N/A',
        expMonth: 0,
        expYear: 0
      },
      discount: this.cartService.totals()?.discount
    }
  }

  private async getAddressFromStripeAddress(): Promise<Address | ShippingAddress | null> {
    // Replace with address form logic or keep as is if address element is still used
    return null;
  }

  onSaveAddressCheckboxChange(event: MatCheckboxChange) {
    this.saveAddress = event.checked;
  }

  ngOnDestroy(): void {
    // Remove payment element disposal
  }
}
