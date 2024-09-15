import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsNotEmpty } from "class-validator"

export class LoginUserDto {
    @IsNotEmpty()
    @ApiProperty({ description: "Username or email" })
    username: string; 

    @IsNotEmpty()
    @ApiProperty()
    password: string
}