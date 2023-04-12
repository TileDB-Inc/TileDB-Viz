import getTileDBClient from '../getTileDBClient';

const registrationTimestampCache: Record<string, number> = {};

const getArrayRegistrationTimestamp = async (ns: string, arrayName: string) => {
  const key = `${ns}:${arrayName}`;
  if (registrationTimestampCache[key]) {
    return registrationTimestampCache[key];
  }
  const client = getTileDBClient();
  const res = await client.ArrayApi.arrayActivityLog(
    ns,
    arrayName,
    0,
    undefined,
    'register'
  );
  const [firstLog = {}] = res.data;
  const date = new Date(firstLog.event_at as string);
  const timestamp = Number(date);
  registrationTimestampCache[key] = timestamp;

  return timestamp;
};

export default getArrayRegistrationTimestamp;
