const axios = require('axios');
const launches = require('./launches.mongo');
const planets = require('./planets.mongo');

const DEFAULT_FLIGHT_NUMBER = 0;

const SPACE_X_API_URL = 'https://api.spacexdata.com/v4/launches/query';

async function populateLaunches() {
    console.log('Downloading launch data...');
    const response = await axios.post(SPACE_X_API_URL, {
        query: {},
        options: {
            pagination: false,
            populate: [
                {
                    path: "rocket",
                    select: {
                        name: 1,
                    }
                },
                {
                    path: "payloads",
                    select: {
                        customers: 1,
                    }
                }
            ]
        }
    });

    if (response.status !== 200) {
        console.log("Problem downloading launch data")
        throw new Error("Launch data download failed");
    }

    const launchDocs = response.data.docs;

    launchDocs.map((launchData) => {
        const payloads = launchData.payloads;
        const customers = payloads.flatMap((payload) => {
            return payload.customers;
        });

        const launch = {
            flightNumber: launchData.flight_number,
            mission: launchData.name,
            rocket: launchData.rocket.name,
            launchDate: launchData.date_local,
            upcoming: launchData.upcoming,
            success: launchData.success,
            customers
        }

        console.log(`${launch.flightNumber} ${launch.mission}`);

        // * Populate launches collection
        saveLaunch(launch);
    })
}

async function loadLaunchData() {
    const firstLaunch = await findLaunch({
        flightNumber: 1,
        rocket: 'Falcon 1',
        mission: 'FalconSat',
    });

    if (firstLaunch) {
        console.log('Launch data already loaded');
    } else {
        await populateLaunches();
    }
}

async function findLaunch(filter) {
    return await launches.findOne(filter);
}

async function existsWithLaunchId(launchId) {
    return await findLaunch({ flightNumber: launchId });
}

async function getLatestFlightNumber() {
    const latestLaunch = await launches
        .findOne({})
        .sort('-flightNumber');

    if (!latestLaunch) {
        return DEFAULT_FLIGHT_NUMBER;
    }

    return latestLaunch.flightNumber;
}

async function getAllLaunches(skip, limit) {
    return await launches
        .find({}, { '_id': 0, '__v': 0 })
        .sort({ flightNumber: 1 })
        .skip(skip)
        .limit(limit);
}

async function saveLaunch(launch) {
    await launches.findOneAndUpdate({
        flightNumber: launch.flightNumber,
    }, launch, {
        upsert: true,
    })
}

function getLatestLaunch() {
    const allLaunches = getAllLaunches();
    return allLaunches[allLaunches.length - 1];
}

async function scheduleNewLaunch(launch) {
    const planet = await planets.findOne({
        keplerName: launch.target,
    });

    if (!planet) {
        throw new Error('No matching planet found');
    }

    const newFlightNumber = (await getLatestFlightNumber()) + 1;

    const newLaunch = Object.assign(launch, {
        success: true,
        upcoming: true,
        customers: ['s1rbl4ck', 'NASA'],
        flightNumber: newFlightNumber,
    });

    await saveLaunch(newLaunch);
}

async function abortLaunchById(id) {
    const aborted = await launches.updateOne({
        flightNumber: id,
    }, {
        upcoming: false,
        success: false,
    });

    return aborted.modifiedCount === 1;
}

module.exports = {
    loadLaunchesData: loadLaunchData,
    existsWithLaunchId,
    getAllLaunches,
    scheduleNewLaunch,
    abortLaunchById
}