const { Client } = require("@googlemaps/google-maps-services-js");

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const client = new Client({});

/**
 * 住所をジオコーディングし、緯度経度と整形された住所を返します。
 * @param {string} address - ジオコーディングする住所または場所名。
 * @returns {Promise<{lat: number, lng: number, formattedAddress: string}>} 緯度経度と整形された住所。
 * @throws {Error} APIキーが設定されていない場合、またはジオコーディングに失敗した場合。
 */
async function geocodeAddress(address) {
    if (!GOOGLE_MAPS_API_KEY) {
        throw new Error('GOOGLE_MAPS_API_KEY is not set.');
    }
    try {
        const response = await client.geocode({
            params: {
                address: address,
                key: GOOGLE_MAPS_API_KEY,
                language: 'ja' // 日本語で結果を取得
            },
            timeout: 1000 // 1 second
        });

        if (response.data.results.length > 0) {
            const location = response.data.results[0].geometry.location;
            const formattedAddress = response.data.results[0].formatted_address;
            return { lat: location.lat, lng: location.lng, formattedAddress: formattedAddress };
        } else {
            throw new Error('No results found for the given address.');
        }
    } catch (error) {
        console.error('Geocoding API Error:', error.response ? error.response.data : error.message);
        throw new Error('Failed to geocode address.');
    }
}

/**
 * 指定された場所の最寄駅とそこからの徒歩時間を取得します。
 * @param {number} lat - 目的地の緯度。
 * @param {number} lng - 目的地の経度。
 * @returns {Promise<{stationName: string, walkTimeMinutes: number}>} 最寄駅名と徒歩時間（分）。
 * @throws {Error} APIキーが設定されていない場合、または最寄駅の検索に失敗した場合。
 */
async function getNearestStationAndWalkTime(lat, lng) {
    if (!GOOGLE_MAPS_API_KEY) {
        throw new Error('GOOGLE_MAPS_API_KEY is not set.');
    }

    try {
        // 1. 周辺の駅を検索 (Place Search API - Nearby Search)
        // Note: Directions APIだけでは最寄駅を特定できないため、Place Searchと組み合わせる
        const placesResponse = await client.placesNearby({
            params: {
                location: { lat, lng },
                radius: 2000, // 2km圏内を検索
                type: 'train_station', // 駅を検索
                key: GOOGLE_MAPS_API_KEY,
                language: 'ja'
            },
            timeout: 1000
        });

        console.log('DEBUG: Places API results:', JSON.stringify(placesResponse.data.results, null, 2));

        if (placesResponse.data.results.length === 0) {
            return { stationName: '最寄駅なし', walkTimeMinutes: 0 };
        }

        let nearestStation = null;
        let shortestWalkTime = Infinity;

        // 2. 各駅からの徒歩時間を計算し、最短の駅を特定 (Directions API)
        for (const station of placesResponse.data.results) {
            const directionsResponse = await client.directions({
                params: {
                    origin: { lat: station.geometry.location.lat, lng: station.geometry.location.lng },
                    destination: { lat, lng },
                    mode: 'walking',
                    key: GOOGLE_MAPS_API_KEY,
                    language: 'ja'
                },
                timeout: 1000
            });

            if (directionsResponse.data.routes.length > 0) {
                const route = directionsResponse.data.routes[0];
                const leg = route.legs[0]; // 通常、単一の出発地と目的地なので最初のleg
                const durationSeconds = leg.duration.value;
                const walkTimeMinutes = Math.ceil(durationSeconds / 60);

                if (walkTimeMinutes < shortestWalkTime) {
                    shortestWalkTime = walkTimeMinutes;
                    nearestStation = station.name;
                }
            }
        }

        if (nearestStation) {
            return { stationName: nearestStation, walkTimeMinutes: shortestWalkTime };
        } else {
            return { stationName: '最寄駅特定不可', walkTimeMinutes: 0 };
        }

    } catch (error) {
        console.error('Map Service API Error:', error.response ? error.response.data : error.message);
        throw new Error('Failed to get nearest station and walk time.');
    }
}

async function getDirections(origin, destination, mode = 'walking') {
    if (!GOOGLE_MAPS_API_KEY) {
        throw new Error('GOOGLE_MAPS_API_KEY is not set.');
    }
    try {
        const response = await client.directions({
            params: {
                origin: origin,
                destination: destination,
                mode: mode,
                key: GOOGLE_MAPS_API_KEY,
                language: 'ja'
            },
            timeout: 2000 // タイムアウトを2秒に延長
        });

        if (response.data.routes.length > 0) {
            // ルート描画に必要なエンコード済みポリラインを返す
            return {
                polyline: response.data.routes[0].overview_polyline.points
            };
        } else {
            // ルートが見つからなかった場合
            return { polyline: '' };
        }
    } catch (error) {
        console.error('Directions API Error:', error.response ? error.response.data : error.message);
        throw new Error('Failed to get directions.');
    }
}

module.exports = {
    geocodeAddress,
    getNearestStationAndWalkTime,
    getDirections
};
