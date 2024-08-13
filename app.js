const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'covid19India.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

app.get('/states/', async (request, response) => {
  const getStatesQuery = `
SELECT
 *
FROM
 state
ORDER BY
 state_id;`
  const stateArray = await db.all(getStatesQuery)
  const ConvertDBObject = dbObject => {
    return {
      stateId: dbObject.state_id,
      stateName: dbObject.state_name,
      population: dbObject.population,
    }
  }
  response.send(stateArray.map(eachstate => ConvertDBObject(eachstate)))
})

app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const getstateQuery = `
  SELECT
   state_id as stateId, state_name as stateName, population as population
  FROM
   state
  WHERE
   state_id = ${stateId};`
  const state = await db.get(getstateQuery)
  // const ConvertDBObject = dbObject => {
  //   return {
  //     stateId: dbObject.state_id,
  //     stateName: dbObject.state_name,
  //     population: dbObject.population,
  //   }
  // }
  response.send(state)
})

app.post('/districts/', async (request, response) => {
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const addDistrictQuery = `
  INSERT INTO district(district_name, state_id, cases, cured, active, deaths)
  VALUES
  ('${districtName}',
    ${stateId},
    ${cases},
    ${cured},
    ${active},
    ${deaths});`
  const dbResponse = await db.run(addDistrictQuery)
  const districtId = dbResponse.lastID
  response.send('District Successfully Added')
})

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const getdistrictQuery = `
    SELECT
      district_id as districtId, district_name as districtName, state_id as stateId, cases as cases, cured as cured, active as active, deaths as deaths
    FROM
      district
    WHERE
      district_id = ${districtId};`
  const district = await db.get(getdistrictQuery)
  response.send(district)
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteBookQuery = `
  DELETE FROM 
    district
  WHERE 
  district_id = ${districtId};`
  await db.run(deleteBookQuery)
  response.send('District Removed')
})

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const updateDistrictDetails = `
  UPDATE
    district
  SET
    district_name='${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
    WHERE
      district_id = ${districtId};`
  await db.run(updateDistrictDetails)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getstateQuery = `
    SELECT
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
   FROM
      district
    WHERE
      state_id = ${stateId};`
  const stats = await db.get(getstateQuery)

  console.log(stats)

  response.send({
    totalCases: stats['SUM(cases)'],
    totalCured: stats['SUM(cured)'],
    totalActive: stats['SUM(active)'],
    totalDeaths: stats['SUM(deaths)'],
  })
})

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const getdistrictQuery = `
    SELECT
      state_id
    FROM
      district
    where
      district_id = ${districtId};`
  const districtResponse = await db.get(getdistrictQuery)

  const getStateNameQuery = `
  select state_name as stateName from state
  where state_id = ${districtResponse.state_id};`
  const getStateNameQueryResponse = await db.get(getStateNameQuery)
  response.send(getStateNameQueryResponse)
})

module.exports = app
