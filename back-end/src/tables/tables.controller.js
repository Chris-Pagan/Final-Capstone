const service = require("./tables.service");
const reservationsService = require("../reservations/reservations.service");
const asyncErrorBoundary = require("../errors/asyncErrorBoundary");
const hasProperties = require("../errors/hasProperties");

async function list(req, res, next) {
  res.json({ data: await service.list()});
}

async function create(req, res, next) {
    const data=await service.create(req.body.data)
  res.status(201).json({ data });
}

async function seatReservation(req, res, next) {
  const { reservation_id } = res.locals.reservation;
  const { table_id } = req.params;
  res.json({ data: await service.updateToSeated(Number(table_id), reservation_id) });
}

async function clear(req, res, next) {
  const { reservation_id,table_id } = res.locals.table;
  res.status(200).json({ data: await service.cleanTable(Number(table_id), reservation_id) });
}

//======VALIDATION FUNCTIONS========//

const reservationExists = async (req, res, next) => {
  const { reservation_id } = req.body.data;
  const reservation = await reservationsService.read(reservation_id);
  if (reservation) {
    res.locals.reservation = reservation;
    next();
  } else {
    next({
      status: 404,
      message: `Sorry no reservation found with id:${reservation_id}`,
    });
  }
};
const tableExists = async (req, res, next) => {
  const { table_id } = req.params;
  const table = await service.read(table_id);
  if (table) {
    res.locals.table = table;
    next();
  } else {
    next({
      status: 404,
      message: `Sorry no table found with id:${table_id}`,
    });
  }
};

const hasPayload = (req, res, next) => {
  const data = req.body.data;
  if (!data) {
    next({
      status: 400,
      message: "Data is required for a valid request",
    });
  } else {
    next();
  }
};
const tableNameValidation = (req, res, next) => {
  const { table_name } = req.body.data;
  if (!table_name || table_name.length <= 1) {
    return next({
      status: 400,
      message: "'table_name' must be at least two characters",
    });
  }
  next()
};
const capacityValidation = (req, res, next) => {
  const { capacity } = req.body.data;
  if (!capacity || capacity <= 0||typeof capacity!=="number") {
    return next({
      status: 400,
      message: "'capacity' must be a number greater than 0",
    });
  }
  next()
};
const VALID_PROPERTIES = [
    "table_name", "capacity", "reservation_id"
];
const hasOnlyValidProperties = (req, res, next) => {
  const { data = {} } = req.body;

  const invalidFields = Object.keys(data).filter(
    (field) => !VALID_PROPERTIES.includes(field)
  );

  if (invalidFields.length) {
    return next({
      status: 400,
      message: `Invalid field(s): ${invalidFields.join(", ")}`,
    });
  }
  next();
};
const requiredFieldsCheckCreate = hasProperties(...VALID_PROPERTIES.slice(0,2));
const requiredFieldsCheckUpdate = hasProperties(...VALID_PROPERTIES.slice(2));

const statusValidation = (req,res,next)=>{
    const {status}=res.locals.reservation
    if(status!=="booked"){
        return next({
            status:400,
            message:`reservations with a status of:${status} cannot be seated`
        })
    }
    next()
}
const capacityCheck = (req,res,next) =>{
    const {capacity}=res.locals.table
    const {people}=res.locals.reservation
    if(people>capacity){
        return next({
            status:400,
            message:`people must be less than table capacity`
        })
    }
    next()
}
const occupancyCheck = (req,res,next)=>{
    const {reservation_id} = res.locals.table
    if(reservation_id){
        return next({
            status:400,
            message:"Sorry! This table is already occupied."
        })
    }
    next()
}
const inUseValidation = (req,res,next)=>{
    const {reservation_id} = res.locals.table
    if(!reservation_id){
        return next({
            status:400,
            message:"This table is not occupied. Only occupied tables can be cleared"
        })
    }
    next()
}

//Exports
module.exports = {
  list: asyncErrorBoundary(list),
  create: [
    hasPayload,
    requiredFieldsCheckCreate,
    hasOnlyValidProperties,
    tableNameValidation,
    capacityValidation,
    asyncErrorBoundary(create),
  ],
  update: [
    hasPayload,
    asyncErrorBoundary(tableExists),
    requiredFieldsCheckUpdate,
    asyncErrorBoundary(reservationExists),
    hasOnlyValidProperties,
    statusValidation,
    capacityCheck,
    occupancyCheck,
    asyncErrorBoundary(seatReservation)
  ],
  delete: [asyncErrorBoundary(tableExists), inUseValidation, asyncErrorBoundary(clear)],
};