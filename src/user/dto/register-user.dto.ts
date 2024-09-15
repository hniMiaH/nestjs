import { ApiProperty } from "@nestjs/swagger"

export class RegisterUserDto {
    @ApiProperty()
    username: string

    @ApiProperty()
    firstName: string

    @ApiProperty()
    lastName: string

    @ApiProperty()
    email: string

    @ApiProperty()
    password: string

    @ApiProperty()
    status: Active
}