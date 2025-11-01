const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const {
    updateUserSubscription,
    getUserByStripeCustomer,
    logSubscriptionEvent
} = require('./supabase-client');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    const sig = event.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let stripeEvent;

    try {
        stripeEvent = stripe.webhooks.constructEvent(
            event.body,
            sig,
            webhookSecret
        );
    } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: `Webhook Error: ${err.message}` })
        };
    }

    console.log('📬 Received webhook event:', stripeEvent.type);

    try {
        // Handle the event
        switch (stripeEvent.type) {
            case 'checkout.session.completed':
                const session = stripeEvent.data.object;
                console.log('✅ Checkout session completed:', session.id);
                console.log('   Customer:', session.customer);
                console.log('   Subscription:', session.subscription);

                // Subscription will be handled by subscription.created event
                break;

            case 'customer.subscription.created':
                const createdSubscription = stripeEvent.data.object;
                console.log('📝 Subscription created:', createdSubscription.id);

                await handleSubscriptionChange(createdSubscription, stripeEvent);
                break;

            case 'customer.subscription.updated':
                const updatedSubscription = stripeEvent.data.object;
                console.log('🔄 Subscription updated:', updatedSubscription.id);

                await handleSubscriptionChange(updatedSubscription, stripeEvent);
                break;

            case 'customer.subscription.deleted':
                const deletedSubscription = stripeEvent.data.object;
                console.log('❌ Subscription canceled:', deletedSubscription.id);

                await handleSubscriptionChange(deletedSubscription, stripeEvent);
                break;

            case 'invoice.payment_succeeded':
                const invoice = stripeEvent.data.object;
                console.log('💰 Payment succeeded for invoice:', invoice.id);

                // Update subscription status if needed
                if (invoice.subscription) {
                    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
                    await handleSubscriptionChange(subscription, stripeEvent);
                }
                break;

            case 'invoice.payment_failed':
                const failedInvoice = stripeEvent.data.object;
                console.log('⚠️ Payment failed for invoice:', failedInvoice.id);

                // Update subscription to past_due if needed
                if (failedInvoice.subscription) {
                    const subscription = await stripe.subscriptions.retrieve(failedInvoice.subscription);
                    await handleSubscriptionChange(subscription, stripeEvent);
                }
                break;

            default:
                console.log(`ℹ️  Unhandled event type: ${stripeEvent.type}`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ received: true })
        };

    } catch (error) {
        console.error('❌ Error processing webhook:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Webhook processing failed' })
        };
    }
};

/**
 * Handles subscription create/update/delete events
 * Updates Supabase database with new subscription status
 */
async function handleSubscriptionChange(subscription, stripeEvent) {
    try {
        const customerId = subscription.customer;

        // Determine subscription plan from interval
        let plan = 'monthly';
        if (subscription.items && subscription.items.data.length > 0) {
            const interval = subscription.items.data[0].price.recurring?.interval;
            plan = interval === 'year' ? 'yearly' : 'monthly';
        }

        const subscriptionData = {
            id: subscription.id,
            status: subscription.status,
            plan: plan,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end,
            created: subscription.created
        };

        // Update user in Supabase
        const user = await updateUserSubscription(customerId, subscriptionData);

        // Log the event
        await logSubscriptionEvent(user.id, stripeEvent);

        console.log('✅ Successfully updated subscription in Supabase for user:', user.email);

    } catch (error) {
        console.error('❌ Error handling subscription change:', error);
        throw error;
    }
}