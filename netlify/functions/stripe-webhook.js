const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
        console.error('Webhook signature verification failed:', err.message);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: `Webhook Error: ${err.message}` })
        };
    }
    
    // Handle the event
    switch (stripeEvent.type) {
        case 'checkout.session.completed':
            const session = stripeEvent.data.object;
            console.log('Checkout session completed:', session.id);
            // Subscription is automatically created by Stripe
            break;
            
        case 'customer.subscription.created':
            const createdSubscription = stripeEvent.data.object;
            console.log('Subscription created:', createdSubscription.id);
            break;
            
        case 'customer.subscription.updated':
            const updatedSubscription = stripeEvent.data.object;
            console.log('Subscription updated:', updatedSubscription.id);
            break;
            
        case 'customer.subscription.deleted':
            const deletedSubscription = stripeEvent.data.object;
            console.log('Subscription canceled:', deletedSubscription.id);
            break;
            
        default:
            console.log(`Unhandled event type: ${stripeEvent.type}`);
    }
    
    return {
        statusCode: 200,
        body: JSON.stringify({ received: true })
    };
};