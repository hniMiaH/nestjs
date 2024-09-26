import { ApiProperty } from "@nestjs/swagger"

export class StoreGmailInfoDto {
    @ApiProperty({
        nullable: false
    })
    id: string

    @ApiProperty({
        nullable: false
    })
    firstName: string;


    @ApiProperty({
        nullable: false
    })
    lastName: string;

    @ApiProperty({
        nullable: false
    })
    email: string

    @ApiProperty({
        nullable: false
    })
    avatar: string
    
    @ApiProperty({
        nullable: false

    })
    refresh_token: string;
}