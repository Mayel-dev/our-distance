import { IsNotEmpty, IsString } from 'class-validator';

export class ConnectPartnerDto {
  @IsString()
  @IsNotEmpty()
  pairingCode: string;
}
