const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const {
    getOrCreateUser,
    updateUserStripeCustomer,
    getUserByStripeCustomer
} = require('./supabase-client');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { email } = JSON.parse(event.body);

        if (!email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Email is required' })
            };
        }

        console.log('🛒 Creating checkout session for:', email);

        // Get or create user in Supabase
        const user = await getOrCreateUser(email);

        // Check if user already has a Stripe customer ID
        let customer = null;
        if (user.stripe_customer_id) {
            try {
                customer = await stripe.customers.retrieve(user.stripe_customer_id);
                console.log('✅ Found existing Stripe customer:', customer.id);
            } catch (err) {
                console.warn('⚠️ Stripe customer not found, creating new one');
                customer = null;
            }
        }

        // Create new Stripe customer if needed
        if (!customer) {
            customer = await stripe.customers.create({
                email: email,
                metadata: {
                    supabase_user_id: user.id
                }
            });
            console.log('✅ Created new Stripe customer:', customer.id);

            // Save Stripe customer ID to Supabase
            await updateUserStripeCustomer(user.id, customer.id);
        }
        
        // Get the base URL from the event
        const origin = event.headers.origin || event.headers.referer || 'http://localhost:8888';

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            client_reference_id: user.id, // Link to Supabase user
            customer_email: email,
            payment_method_types: ['card', 'ideal'], // Support iDEAL for Dutch users
            line_items: [
                {
                    price_data: {
                        currency: 'eur', // Changed to EUR for European users
                        product_data: {
                            name: 'CV Tool - Premium Membership',
                            description: 'Unlimited AI-powered CV tailoring and optimization',
                        },
                        unit_amount: 999, // €9.99 in cents
                        recurring: {
                            interval: 'month',
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/plans.html?canceled=true`,
            allow_promotion_codes: true, // Allow discount codes
            billing_address_collection: 'auto',
            metadata: {
                supabase_user_id: user.id,
                user_email: email
            }
        });

        console.log('✅ Checkout session created:', session.id);

        return {
            statusCode: 200,
            body: JSON.stringify({
                sessionId: session.id,
                url: session.url
            })
        };
        
    } catch (error) {
        console.error('Error creating checkout session:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to create checkout session' })
        };
    }
};