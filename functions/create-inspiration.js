// Edge Function: Create inspiration with location and weather information
// Uses free IP location and weather APIs

module.exports = async function(request) {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Handle OPTIONS request
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        // Extract token from request headers
        const authHeader = request.headers.get('Authorization');
        const userToken = authHeader ? authHeader.replace('Bearer ', '') : null;

        if (!userToken) {
            return new Response(JSON.stringify({ error: 'Unauthorized access' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Create client with the user token
        const client = createClient({
            baseUrl: Deno.env.get('BACKEND_INTERNAL_URL') || 'http://insforge:7130',
            edgeFunctionToken: userToken
        });

        // Get authenticated user
        const { data: userData } = await client.auth.getCurrentUser();
        if (!userData?.user?.id) {
            return new Response(JSON.stringify({ error: 'User authentication failed' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Parse request body
        const body = await request.json();
        const { title, content, tags, category, mood, image_url, is_private } = body;

        // Get user IP address
        let clientIP = request.headers.get('cf-connecting-ip') ||
                      request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      '127.0.0.1'; // fallback for local development

        // If x-forwarded-for contains multiple IPs, take the first public IP
        if (clientIP.includes(',')) {
            const ips = clientIP.split(',').map(ip => ip.trim());
            // Take the first non-private IP
            clientIP = ips.find(ip => {
                // Filter out private IPs and local addresses
                return !ip.startsWith('10.') &&
                       !ip.startsWith('192.168.') &&
                       !ip.startsWith('172.') &&
                       ip !== '127.0.0.1' &&
                       ip !== '::1';
            }) || ips[0]; // If all are private, use the first one
        }

        console.log('Client IP:', clientIP);

        // Get geographic location
        let locationData = null;
        let weatherData = null;

        try {
            // Use ip-api.com free service for location
            const locationUrl = `http://ip-api.com/json/${clientIP}?fields=status,message,country,regionName,city,lat,lon`;
            console.log('Fetching location from:', locationUrl);

            const locationResponse = await fetch(locationUrl);
            console.log('Location response status:', locationResponse.status);

            if (locationResponse.ok) {
                const location = await locationResponse.json();
                console.log('Location API response:', location);

                if (location.status === 'success') {
                    locationData = {
                        country: location.country,
                        region: location.regionName,
                        city: location.city,
                        lat: location.lat,
                        lon: location.lon
                    };
                    console.log('Location data extracted:', locationData);
                } else {
                    console.log('Location API failed:', location.message);
                }
            } else {
                console.log('Location response not ok:', locationResponse.statusText);
            }
        } catch (error) {
            console.error('Location API error:', error);
        }

        // Get weather information (using wttr.in free API)
        if (locationData && locationData.city) {
            try {
                const weatherUrl = `https://wttr.in/${encodeURIComponent(locationData.city)}?format=j1`;
                console.log('Fetching weather from:', weatherUrl);

                const weatherResponse = await fetch(weatherUrl);
                console.log('Weather response status:', weatherResponse.status);

                if (weatherResponse.ok) {
                    const weather = await weatherResponse.json();
                    console.log('Weather API response:', weather);

                    if (weather.current_condition && weather.current_condition[0]) {
                        const current = weather.current_condition[0];

                        weatherData = {
                            condition: current.weatherDesc[0].value,
                            temperature: parseFloat(current.temp_C),
                            description: current.weatherDesc[0].value,
                            humidity: parseInt(current.humidity)
                        };
                        console.log('Weather data extracted:', weatherData);
                    } else {
                        console.log('Weather API response missing current_condition');
                    }
                } else {
                    console.log('Weather response not ok:', weatherResponse.statusText);
                }
            } catch (error) {
                console.error('Weather API error:', error);
                // If weather API fails, use fallback data
                weatherData = {
                    condition: 'Unknown',
                    temperature: null,
                    description: 'Weather information unavailable',
                    humidity: null
                };
            }
        } else {
            console.log('No location data available for weather lookup');
        }

        // Create inspiration record
        const inspirationData = {
            user_id: userData.user.id,
            title,
            content,
            tags: tags || [],
            category,
            mood,
            image_url,
            is_private: is_private || false,
            ip_address: clientIP,
            location_country: locationData?.country || null,
            location_region: locationData?.region || null,
            location_city: locationData?.city || null,
            weather_condition: weatherData?.condition || null,
            weather_temperature: weatherData?.temperature || null,
            weather_description: weatherData?.description || null,
            weather_humidity: weatherData?.humidity || null
        };

        // Save to database
        const { data: inspiration, error } = await client.database
            .from('inspirations')
            .insert([inspirationData])
            .select()
            .single();

        if (error) {
            console.error('Database error:', error);
            return new Response(JSON.stringify({ error: 'Failed to save inspiration', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Return success result
        return new Response(JSON.stringify({
            success: true,
            data: inspiration,
            location: locationData,
            weather: weatherData
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Function error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            details: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
};
