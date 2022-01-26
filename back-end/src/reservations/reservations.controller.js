const service = require("./reservations.service");
const asyncErrorBoundary = require("../errors/asyncErrorBoundary");
const hasProperties = require("../errors/hasProperties");
/**
 * List handler for reservation resources
 */
async function list(req, res) {
  const { date } = req.query;
  const { mobile_number } = req.query;
  let data;
  
  if (date) {
    data = await service.listByDate(date);
  } else if (mobile_number) {
    data = await service.listByMobileNumber(mobile_number);
  } else {
    data = await service.list();
  }
  res.json({ data });
}

async function read(req, res) {
  res.json({ data: await service.read(res.locals.reservation.reservation_id) });
}
async function create(req, res) {
  const data = await service.create(req.body.data);
  res.status(201).json({ data });
}
async function update(req, res) {
  const { reservation_id } = res.locals.reservation;
  const editedReservation = {
    ...req.body.data,
    reservation_id,
  };
  const data = await service.update(editedReservation);
  res.json({ data });
}
async function destroy(req, res) {
  await service.destroy(res.locals.reservation.reservation_id);
  res.sendStatus(201);
}

//Validations

const reservationExists = async (req, res, next) => {
  const { reservation_id } = req.params;
  const reservation = await service.read(reservation_id);
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


const VALID_PROPERTIES = [
  "first_name",
  "last_name",
  "mobile_number",
  "reservation_date",
  "reservation_time",
  "people",
  "status",
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

const requiredFieldsCheck = hasProperties(...VALID_PROPERTIES.slice(0, 6));

const dateValidation = (req, res, next) => {
  const { reservation_date } = req.body.data;
  const today = new Date();
  const reservationDate = new Date(reservation_date);
  
  const dateFormat = /\d\d\d\d-\d\d-\d\d/;
  
  if (!dateFormat.test(reservation_date)) {
    next({
      status: 400,
      message: "reservation_date must be submitted in 'YYYY-MM-DD' format.",
    });
  } else if (reservationDate.getUTCDay() === 2) {
    next({
      status: 400,
      message:
        "Sorry we are closed on Tuesdays, please pick a different reservation_date",
    });
  } else if (res.locals.reservation) {
    return next();
    // '2' is the equivalent to Tuesday
  } else if (reservationDate < today) {
    next({
      status: 400,
      message: "reservation_date must be made at least a day in the future",
    });
  } else {
    next();
  }
};

const timeValidation = (req, res, next) => {
  const { reservation_time } = req.body.data;
  
  const timeFormat = /^([0-1]?[0-9]|2[0-4]):([0-5][0-9])(:[0-5][0-9])?$/;
  if (!timeFormat.test(reservation_time)) {
    next({
      status: 400,
      message:
        "reservation_time must be submitted in 'HH:MM:SS' or 'HH:MM' format",
    });
  } else if (reservation_time < "10:30" || reservation_time > "21:30") {
    next({
      status: 400,
      message: "reservations must be made between 10:30AM  and 9:30PM",
    });
  } else {
    next();
  }
};
const peopleValidation = (req, res, next) => {
  const { people } = req.body.data;
  if (people <= 0 || typeof people !== "number") {
    next({
      status: 400,
      message: "people must be a number greater than 0",
    });
  } else {
    next();
  }
};

const statusValidation = (req, res, next) => {
  const { status } = req.body.data;
  if (!["booked", "seated", "cancelled", "finished"].includes(status)) {
    return next({
      status: 400,
      message: `${status} is not a valid status`,
    });
  }
  next();
};

const finishedNotAllowed = (req, res, next) => {
  const { status } = res.locals.reservation;
  if (status === "finished") {
    return next({
      status: 400,
      message: `${status} reservation cannot be updated`,
    });
  }
  next();
};

const bookedValidation = (req, res, next) => {
  const { status } = req.body.data;
  if(status){
    if (status !== "booked") {
      return next({
        status: 400,
        message: `Status:${status} is not valid. Reservation must start off as "book"`,
      });
    }
}
  next();
};

//Exports
module.exports = {
  list: asyncErrorBoundary(list),
  read: [asyncErrorBoundary(reservationExists), read],
  update: [
    asyncErrorBoundary(reservationExists),
    requiredFieldsCheck,
    dateValidation,
    timeValidation,
    peopleValidation,
    asyncErrorBoundary(update),
  ],
  updateStatus: [
    asyncErrorBoundary(reservationExists),
    finishedNotAllowed,
    statusValidation,
    asyncErrorBoundary(update),
  ],
  create: [
    hasPayload,
    requiredFieldsCheck,
    bookedValidation,
    hasOnlyValidProperties,
    dateValidation,
    timeValidation,
    peopleValidation,
    asyncErrorBoundary(create),
  ],
  delete: [asyncErrorBoundary(reservationExists), asyncErrorBoundary(destroy)],
};