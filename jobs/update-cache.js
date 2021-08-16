const roundTo = require('round-to');

const cloudflare = require('../modules/cloudflare');
const remoteData = require('../modules/remote-data');
const doQuery = require('../modules/do-query');

module.exports = async () => {
    const itemMap = await remoteData.get();
    const itemData = {};

    const avgPriceYesterday = await doQuery(`SELECT
        avg(price) AS priceYesterday,
        item_id,
        timestamp
    FROM
        price_data
    WHERE
        timestamp > DATE_SUB(NOW(), INTERVAL 2 DAY)
    AND
        timestamp < DATE_SUB(NOW(), INTERVAL 1 DAY)
    GROUP BY
        item_id`);

    const lastKnownPriceData = await doQuery(`SELECT
        price,
        max(timestamp) as timestamp,
        item_id
    FROM
        price_data
    GROUP BY
        item_id
    ORDER BY
        timestamp
    DESC`);

    for (const [key, value] of itemMap.entries()) {
        itemData[key] = value;

        Reflect.deleteProperty(itemData[key], 'last_update');
        Reflect.deleteProperty(itemData[key], 'last_scan');
        Reflect.deleteProperty(itemData[key], 'checked_out_by');
        Reflect.deleteProperty(itemData[key], 'trader_last_scan');
        Reflect.deleteProperty(itemData[key], 'trader_checked_out_by');

        if(itemData[key].disabled && !itemData[key].types.includes('no-flea')){
            itemData[key].types.push('no-flea');
        }

        let itemPriceYesterday = avgPriceYesterday.find(row => row.item_id === key);
        if(!itemPriceYesterday || itemData[key].avg24hPrice === 0){
            itemData[key].changeLast48h = 0;
        } else {
            const percentOfDayBefore = itemData[key].avg24hPrice / itemPriceYesterday.priceYesterday
            itemData[key].changeLast48h = roundTo((percentOfDayBefore - 1) * 100, 2);
        }

        if(itemData[key].lastLowPrice === 0){
            let lastKnownPrice = lastKnownPriceData.find(row => row.item_id === key);
            if(lastKnownPrice){
                itemData[key].updated = lastKnownPrice.timestamp;
                itemData[key].lastLowPrice = lastKnownPrice.price;
            }
        }

        // itemData[key].changeLast48h = itemPriceYesterday.priceYesterday || 0;
    }

    try {
        const response = await cloudflare(`accounts/66766e138fce1ac1d2ef95953e037f4e/storage/kv/namespaces/f04e5b75ee894b3a90cec2b7cc351311/values/ITEM_CACHE`, 'PUT', JSON.stringify(itemData));
        console.log(response);
    } catch (requestError){
        console.error(requestError);
    }
};