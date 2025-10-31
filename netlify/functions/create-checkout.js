const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
    
    try {
        const { userId } = JSON.parse(event.body);
        
        // Create or retrieve customer
        const customers = await stripe.customers.list({
            limit: 1
        });
        
        let customer = null;
        for (const c of customers.data) {
            if (c.metadata && c.metadata.userId === userId) {
                customer = c;
                break;
            }
        }
        
        if (!customer) {
            customer = await stripe.customers.create({
                metadata: { userId }
            });
        }
        
        // Get the base URL from the event
        const origin = event.headers.origin || event.headers.referer || 'http://localhost:8888';
        
        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'CV Tailoring Tool - Monthly Subscription',
                            description: 'Unlimited AI-powered CV tailoring and cover letter generation',
                        },
                        unit_amount: 999, // $9.99 in cents
                        recurring: {
                            interval: 'month',
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${origin}?success=true`,
            cancel_url: `${origin}?canceled=true`,
        });
        
        return {
            statusCode: 200,
            body: JSON.stringify({ sessionId: session.id })
        };
        
    } catch (error) {
        console.error('Error creating checkout session:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to create checkout session' })
        };
    }
};