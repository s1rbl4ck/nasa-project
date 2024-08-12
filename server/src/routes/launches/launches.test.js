const request = require("supertest");
const app = require("../../app");
const { mongoConnect, mongoDisconnect } = require("../../services/mongo");

const API_VERSION = "/v1";

describe("Launches API", () => {
    beforeAll(async () => {
        await mongoConnect();
    });

    afterAll(async () => {
        await mongoDisconnect();
    })

    describe("GET /launches", () => {
        test("Respond with 200 status code", async () => {
            await request(app).get(`${API_VERSION}/launches`)
                .expect("Content-Type", /json/)
                .expect(200);
        });
    });

    describe("POST /launches", () => {
        const launchDataWithDate = {
            mission: "USS Enterprise",
            rocket: "NCC 1701-D",
            target: "Kepler-62 f",
            launchDate: "July 8, 2003"
        };

        const launchDataWithoutDate = {
            mission: "USS Enterprise",
            rocket: "NCC 1701-D",
            target: "Kepler-62 f"
        }

        const launchDataWithInvalidDate = {
            mission: "USS Enterprise",
            rocket: "NCC 1701-D",
            target: "Kepler-62 f",
            launchDate: "ThisIsNotADate:))))"
        }

        test("Respond with 201 success", async () => {

            const response = await request(app).post(`${API_VERSION}/launches`)
                .send(launchDataWithDate)
                .expect("Content-Type", /json/)
                .expect(201);

            const requestDate = new Date(launchDataWithDate.launchDate).valueOf();
            const responseDate = new Date(response.body.launchDate).valueOf();

            expect(responseDate).toBe(requestDate);
            expect(response.body).toMatchObject(launchDataWithoutDate);
        })

        test("Catch missing required properties", async () => {
            const response = await request(app).post(`${API_VERSION}/launches`)
                .send(launchDataWithoutDate)
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body).toStrictEqual({
                error: 'Missing required launch property'
            })
        })

        test("Catch invalid dates", async () => {
            const response = await request(app).post(`${API_VERSION}/launches`)
                .send(launchDataWithInvalidDate)
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body).toStrictEqual({
                error: "Invalid launch date"
            })
        });
    });
})
